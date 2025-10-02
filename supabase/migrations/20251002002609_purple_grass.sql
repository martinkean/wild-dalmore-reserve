/*
  # Definitive RLS policy fix - complete reset
  
  This migration completely resets all RLS policies to the simplest possible working state
  to resolve any loading issues.
*/

-- Disable RLS temporarily to ensure we can make changes
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE weed_patches DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies completely (using CASCADE to handle any dependencies)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles CASCADE;

DROP POLICY IF EXISTS "tracks_select_all" ON tracks CASCADE;
DROP POLICY IF EXISTS "tracks_insert_own" ON tracks CASCADE;
DROP POLICY IF EXISTS "tracks_update_own" ON tracks CASCADE;
DROP POLICY IF EXISTS "tracks_delete_own" ON tracks CASCADE;

DROP POLICY IF EXISTS "weed_patches_select_all" ON weed_patches CASCADE;
DROP POLICY IF EXISTS "weed_patches_insert_own" ON weed_patches CASCADE;
DROP POLICY IF EXISTS "weed_patches_update_own" ON weed_patches CASCADE;
DROP POLICY IF EXISTS "weed_patches_delete_own" ON weed_patches CASCADE;

DROP POLICY IF EXISTS "photos_select_all" ON photos CASCADE;
DROP POLICY IF EXISTS "photos_insert_own" ON photos CASCADE;
DROP POLICY IF EXISTS "photos_update_own" ON photos CASCADE;
DROP POLICY IF EXISTS "photos_delete_own" ON photos CASCADE;

-- Drop any other policies that might exist from previous migrations
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles CASCADE';
    END LOOP;
    
    -- Drop all policies on tracks table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tracks' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tracks CASCADE';
    END LOOP;
    
    -- Drop all policies on weed_patches table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'weed_patches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON weed_patches CASCADE';
    END LOOP;
    
    -- Drop all policies on photos table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'photos' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON photos CASCADE';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weed_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible working policies

-- PROFILES: Allow authenticated users to read all profiles and manage their own
CREATE POLICY "allow_read_profiles" ON profiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_insert_own_profile" ON profiles 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_update_own_profile" ON profiles 
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- TRACKS: Allow authenticated users to read all tracks and manage their own
CREATE POLICY "allow_read_tracks" ON tracks 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_insert_own_track" ON tracks 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own_track" ON tracks 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_track" ON tracks 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WEED PATCHES: Allow authenticated users to read all patches and manage their own
CREATE POLICY "allow_read_weed_patches" ON weed_patches 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_insert_own_weed_patch" ON weed_patches 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own_weed_patch" ON weed_patches 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_weed_patch" ON weed_patches 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PHOTOS: Allow authenticated users to read all photos and manage their own
CREATE POLICY "allow_read_photos" ON photos 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_insert_own_photo" ON photos 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own_photo" ON photos 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_photo" ON photos 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ensure the user creation function is clean and simple
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'Editor'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists for user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();