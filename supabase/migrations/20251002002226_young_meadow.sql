/*
  # Simplify RLS policies to fix loading issues
  
  The complex admin checking is causing loading issues. Let's use a simpler approach:
  1. Drop all complex admin policies
  2. Create simple policies that work reliably
  3. Handle admin permissions in the application layer instead of database
*/

-- Drop all existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Users can read all tracks" ON tracks;
DROP POLICY IF EXISTS "Users can manage own tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can manage all tracks" ON tracks;

DROP POLICY IF EXISTS "Users can read all weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Users can manage own weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Admins can manage all weed patches" ON weed_patches;

DROP POLICY IF EXISTS "Users can read all photos" ON photos;
DROP POLICY IF EXISTS "Users can manage own photos" ON photos;
DROP POLICY IF EXISTS "Admins can manage all photos" ON photos;

-- Create simple, reliable policies

-- Profiles: users can read all profiles and update their own
CREATE POLICY "Allow read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Tracks: users can read all tracks, manage their own
CREATE POLICY "Allow read all tracks" ON tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert own tracks" ON tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update own tracks" ON tracks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow delete own tracks" ON tracks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Weed patches: users can read all, manage their own
CREATE POLICY "Allow read all weed patches" ON weed_patches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert own weed patches" ON weed_patches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update own weed patches" ON weed_patches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow delete own weed patches" ON weed_patches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Photos: users can read all, manage their own
CREATE POLICY "Allow read all photos" ON photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert own photos" ON photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow update own photos" ON photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow delete own photos" ON photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Simplify user creation function - just create profile without complex role logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'Editor'  -- Default role, can be changed manually for admins
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up any conflicting functions
DROP FUNCTION IF EXISTS public.sync_user_role();
DROP TRIGGER IF EXISTS on_profile_role_updated ON profiles;