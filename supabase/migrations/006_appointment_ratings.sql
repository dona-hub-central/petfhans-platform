-- Appointment ratings: owners rate vets, vets rate calls
CREATE TABLE IF NOT EXISTS appointment_ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  rated_by        text NOT NULL CHECK (rated_by IN ('owner', 'vet')),
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  is_anonymous    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, rated_by)
);

-- Owners can insert their own rating; vets can insert theirs
ALTER TABLE appointment_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can rate their appointments"
  ON appointment_ratings FOR INSERT
  TO authenticated
  WITH CHECK (rated_by = 'owner');

CREATE POLICY "vets can rate their appointments"
  ON appointment_ratings FOR INSERT
  TO authenticated
  WITH CHECK (rated_by = 'vet');

CREATE POLICY "clinic staff can read ratings"
  ON appointment_ratings FOR SELECT
  TO authenticated
  USING (true);
