/*
  # Fix auth schema permission error

  The previous migration tried to create a function in the auth schema, which is not allowed.
  This migration removes that function and ensures all policies work without it.

  1. Drop the problematic auth.is_admin function if it exists
  2. Ensure all policies use direct JWT metadata checks instead
*/

-- Drop the problematic function if it was created (it probably wasn't due to permissions)
DROP FUNCTION IF EXISTS auth.is_admin();

-- Make sure all our policies are using the correct approach
-- Drop existing admin policies and recreate them with the correct JWT approach

-- Profiles table policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Check if user has admin role in their auth metadata
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = id  -- Users can still manage their own profile
  );

-- Tracks table policies
DROP POLICY IF EXISTS "Admins can manage all tracks" ON tracks;
CREATE POLICY "Admins can manage all tracks"
  ON tracks
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own tracks
  );

-- Weed patches table policies  
DROP POLICY IF EXISTS "Admins can manage all weed patches" ON weed_patches;
CREATE POLICY "Admins can manage all weed patches"
  ON weed_patches
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own weed patches
  );

-- Photos table policies
DROP POLICY IF EXISTS "Admins can manage all photos" ON photos;
CREATE POLICY "Admins can manage all photos"
  ON photos
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own photos
  );

-- Ensure the user creation function is properly set up to add role to auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text := 'Editor';
  user_count integer;
BEGIN
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  IF user_count = 0 THEN
    user_role := 'Admin';
  END IF;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    user_role
  );

  -- Also update the user's auth metadata to include the role
  -- This allows us to check role without querying profiles table
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role)
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync role changes to auth metadata when profile is updated
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger AS $$
BEGIN
  -- Update the user's auth metadata when their role changes
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists for role sync
DROP TRIGGER IF EXISTS on_profile_role_updated ON profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW 
  EXECUTE PROCEDURE public.sync_user_role();