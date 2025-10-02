/*
  # Create photos table for image management with map integration

  1. New Tables
    - `photos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `track_id` (uuid, optional reference to tracks)
      - `weed_patch_id` (uuid, optional reference to weed_patches)
      - `cloudinary_url` (text, full size image URL)
      - `thumbnail_url` (text, compressed thumbnail URL)
      - `lat` (numeric, photo latitude)
      - `lng` (numeric, photo longitude)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `photos` table
    - Add policies for users to read all photos
    - Add policies for users to manage their own photos
    - Add policies for admins to manage all photos
*/

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  weed_patch_id uuid REFERENCES weed_patches(id) ON DELETE SET NULL,
  cloudinary_url text NOT NULL,
  thumbnail_url text,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all photos
CREATE POLICY "Users can read all photos"
  ON photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to manage their own photos
CREATE POLICY "Users can manage own photos"
  ON photos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to manage all photos
CREATE POLICY "Admins can manage all photos"
  ON photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );