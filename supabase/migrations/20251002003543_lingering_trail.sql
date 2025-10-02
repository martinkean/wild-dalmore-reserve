/*
  # Add species field to weed patches for layered management

  1. Changes
    - Add `species` field to weed_patches table
    - Add common weed species as default options
    - Update color assignment to be based on species instead of just status

  2. Notes
    - Species will determine the layer and base color
    - Status (needs weeding/has been weeded) will determine opacity/styling
*/

-- Add species column to weed_patches table
ALTER TABLE weed_patches ADD COLUMN IF NOT EXISTS species text DEFAULT 'Unknown';

-- Add constraint to ensure species is not empty
ALTER TABLE weed_patches ADD CONSTRAINT weed_patches_species_not_empty 
  CHECK (species IS NOT NULL AND length(trim(species)) > 0);

-- Update existing patches to have a default species
UPDATE weed_patches SET species = 'Unknown' WHERE species IS NULL OR species = '';

-- Create index on species for efficient querying
CREATE INDEX IF NOT EXISTS idx_weed_patches_species ON weed_patches(species);

-- Add some common weed species colors (can be customized later)
-- These will be assigned automatically based on species name hash
-- The application will handle color assignment to ensure consistency across users