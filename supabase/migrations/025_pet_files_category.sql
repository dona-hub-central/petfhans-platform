-- Add category column to pet_files for Google-Drive-style document organization.
-- Existing files default to 'other'.
ALTER TABLE pet_files ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
