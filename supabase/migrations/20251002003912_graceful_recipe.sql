/*
  # Fix species field issues causing loading problems

  1. Changes
    - Ensure species field exists and is properly configured
    - Set default species for existing records
    - Remove problematic constraints that might cause conflicts
    - Ensure RLS policies still work properly

  2. Notes
    - This fixes any issues with the species field addition
    - Makes sure existing data is compatible
*/

-- First, check if species column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weed_patches' 
        AND column_name = 'species'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE weed_patches ADD COLUMN species text DEFAULT 'Unknown';
    END IF;
END $$;

-- Update any NULL species values to 'Unknown'
UPDATE weed_patches SET species = 'Unknown' WHERE species IS NULL OR species = '';

-- Drop any problematic constraints that might exist
ALTER TABLE weed_patches DROP CONSTRAINT IF EXISTS weed_patches_species_not_empty;

-- Add a simple check constraint
ALTER TABLE weed_patches ADD CONSTRAINT weed_patches_species_check 
  CHECK (species IS NOT NULL AND length(trim(species)) > 0);

-- Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_weed_patches_species ON weed_patches(species);

-- Make sure the default is properly set
ALTER TABLE weed_patches ALTER COLUMN species SET DEFAULT 'Unknown';