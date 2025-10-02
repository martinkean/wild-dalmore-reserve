/*
  # Fix dependency issues and simplify RLS policies
  
  The previous migration failed because of trigger dependencies.
  This migration properly drops triggers first, then functions, then recreates simple policies.
*/

-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS on_profile_role_updated ON profiles;

-- Drop functions that might have conflicts
DROP FUNCTION IF EXISTS public.sync_user_role();

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

-- Drop any leftover policies from previous migrations
DROP POLICY IF EXISTS "Allow read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;

DROP POLICY IF EXISTS "Allow read all tracks" ON tracks;
DROP POLICY IF EXISTS "Allow insert own tracks" ON tracks;
DROP POLICY IF EXISTS "Allow update own tracks" ON tracks;
DROP POLICY IF EXISTS "Allow delete own tracks" ON tracks;

DROP POLICY IF EXISTS "Allow read all weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Allow insert own weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Allow update own weed patches" ON weed_patches;
DROP POLICY IF EXISTS "Allow delete own weed patches" ON weed_patches;

DROP POLICY IF EXISTS "Allow read all photos" ON photos;
DROP POLICY IF EXISTS "Allow insert own photos" ON photos;
DROP POLICY IF EXISTS "Allow update own photos" ON photos;
DROP POLICY IF EXISTS "Allow delete own photos" ON photos;

-- Create simple, reliable policies that won't cause infinite recursion

-- Profiles: users can read all profiles and manage their own
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Tracks: users can read all tracks, manage their own
CREATE POLICY "tracks_select_all" ON tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tracks_insert_own" ON tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tracks_update_own" ON tracks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tracks_delete_own" ON tracks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Weed patches: users can read all, manage their own
CREATE POLICY "weed_patches_select_all" ON weed_patches FOR SELECT TO authenticated USING (true);
CREATE POLICY "weed_patches_insert_own" ON weed_patches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weed_patches_update_own" ON weed_patches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "weed_patches_delete_own" ON weed_patches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Photos: users can read all, manage their own
CREATE POLICY "photos_select_all" ON photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_insert_own" ON photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photos_update_own" ON photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "photos_delete_own" ON photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Simplify user creation function - just create profile without complex logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'Editor'  -- Default role, first user can be manually changed to Admin
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;