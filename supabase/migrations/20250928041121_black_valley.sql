/*
  # Create weed patches table for circular weed management areas

  1. New Tables
    - `weed_patches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `center_lat` (numeric, latitude of center point)
      - `center_lng` (numeric, longitude of center point)
      - `diameter` (numeric, diameter in meters)
      - `status` (text, 'NEEDS_WEEDING' or 'HAS_BEEN_WEEDED')
      - `color` (text, hex color code based on status)
      - `photo_url` (text, optional Cloudinary URL)
      - `notes` (text, optional notes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `weed_patches` table
    - Add policies for users to read all patches
    - Add policies for users to manage their own patches
    - Add policies for admins to manage all patches
*/

CREATE TABLE IF NOT EXISTS weed_patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  diameter numeric DEFAULT 10 CHECK (diameter >= 5 AND diameter <= 50),
  status text DEFAULT 'NEEDS_WEEDING' CHECK (status IN ('NEEDS_WEEDING', 'HAS_BEEN_WEEDED')),
  color text DEFAULT '#3B82F6',
  photo_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weed_patches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all weed patches
CREATE POLICY "Users can read all weed patches"
  ON weed_patches
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to manage their own weed patches
CREATE POLICY "Users can manage own weed patches"
  ON weed_patches
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to manage all weed patches
CREATE POLICY "Admins can manage all weed patches"
  ON weed_patches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );