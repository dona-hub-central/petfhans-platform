-- Assign a specific vet to an appointment (used for emergency / instant calls)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS vet_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for real-time postgres_changes filter by vet
CREATE INDEX IF NOT EXISTS appointments_vet_id_idx ON appointments(vet_id);
