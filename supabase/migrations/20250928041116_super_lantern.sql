/*
  # Create tracks table for GPS waypoint paths

  1. New Tables
    - `tracks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `coordinates` (jsonb array of lat/lng points)
      - `color` (text, hex color code)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tracks` table
    - Add policies for users to read all tracks
    - Add policies for users to manage their own tracks
    - Add policies for admins to manage all tracks
*/

CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  coordinates jsonb NOT NULL DEFAULT '[]',
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all tracks
CREATE POLICY "Users can read all tracks"
  ON tracks
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to manage their own tracks
CREATE POLICY "Users can manage own tracks"
  ON tracks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to manage all tracks
CREATE POLICY "Admins can manage all tracks"
  ON tracks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );