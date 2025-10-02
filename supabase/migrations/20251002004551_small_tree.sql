/*
  # Add species field to weed patches for layered management

  1. Changes
    - Add `species` field to weed_patches table with default value
    - Update existing patches to have a default species
    - Add index for performance

  2. Notes
    - Species will determine the layer color
    - Each species gets consistent colors across all users
*/

-- Add species column with a safe default
ALTER TABLE weed_patches ADD COLUMN IF NOT EXISTS species text DEFAULT 'Unknown';

-- Update any existing patches that might have NULL species
UPDATE weed_patches SET species = 'Unknown' WHERE species IS NULL OR species = '';

-- Ensure species cannot be null or empty
ALTER TABLE weed_patches ALTER COLUMN species SET NOT NULL;
ALTER TABLE weed_patches ALTER COLUMN species SET DEFAULT 'Unknown';

-- Create index for efficient querying by species
CREATE INDEX IF NOT EXISTS idx_weed_patches_species ON weed_patches(species);