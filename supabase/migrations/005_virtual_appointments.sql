-- Add virtual appointment support
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS is_virtual boolean NOT NULL DEFAULT false;
