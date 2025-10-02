/*
  # Fix infinite recursion in RLS policies

  The issue is that admin policies on profiles table are trying to query profiles table,
  creating infinite recursion. We need to fix this by using a different approach.

  1. Drop problematic policies
  2. Create new policies that avoid infinite recursion
*/

-- Drop the problematic admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can manage all weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Admins can manage all photos" ON photos;

-- Create a function to check if current user is admin without infinite recursion
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Use auth.jwt() to get user metadata directly from JWT token
  -- This avoids querying the profiles table
  RETURN COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Create admin policies using direct user metadata check
-- For profiles table - admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Check if user has admin role in their auth metadata
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = id  -- Users can still manage their own profile
  );

-- For tracks table - admins can manage all tracks  
CREATE POLICY "Admins can manage all tracks"
  ON tracks
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own tracks
  );

-- For weed_patches table - admins can manage all weed patches
CREATE POLICY "Admins can manage all weed patches"
  ON weed_patches
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own weed patches
  );

-- For photos table - admins can manage all photos
CREATE POLICY "Admins can manage all photos"
  ON photos
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'Admin', false)
    OR auth.uid() = user_id  -- Users can still manage their own photos
  );

-- Update the user creation function to also set role in auth metadata
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

-- Trigger to sync role changes to auth metadata
DROP TRIGGER IF EXISTS on_profile_role_updated ON profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW 
  EXECUTE PROCEDURE public.sync_user_role();