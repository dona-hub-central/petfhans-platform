-- 014_marketplace_tables.sql
-- Tablas y columnas nuevas para el módulo de marketplace
-- No modifica ninguna tabla existente excepto añadir columnas a clinics
-- No afecta profiles.clinic_id ni ninguna RLS existente

-- ─────────────────────────────────────────────────────────────
-- 1. Columnas nuevas en clinics (aditivas, sin breaking changes)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS verified       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_profile JSONB;

COMMENT ON COLUMN clinics.verified IS
  'Badge de verificación otorgado manualmente por el superadmin';

COMMENT ON COLUMN clinics.public_profile IS
  'Perfil público de la clínica en el marketplace: descripcion, especialidades, cover_url, horarios';

-- ─────────────────────────────────────────────────────────────
-- 2. care_requests — solicitudes de atención del dueño a una clínica
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS care_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id       UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  pet_name        TEXT,
  pet_species     TEXT,
  reason          TEXT,
  preferred_vet_id UUID       REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  retry_after     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_care_requests_clinic_id
  ON care_requests(clinic_id);

CREATE INDEX IF NOT EXISTS idx_care_requests_requester_id
  ON care_requests(requester_id);

ALTER TABLE care_requests ENABLE ROW LEVEL SECURITY;

-- El dueño ve sus propias solicitudes
CREATE POLICY "owner_sees_own_care_requests" ON care_requests
  FOR SELECT
  USING (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet admin ve y gestiona las solicitudes de su clínica
CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- El dueño puede crear solicitudes
CREATE POLICY "owner_creates_care_requests" ON care_requests
  FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'pet_owner'
  );

-- ─────────────────────────────────────────────────────────────
-- 3. clinic_blocks — bloqueos privados entre clínica y dueño
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_blocks_clinic_id
  ON clinic_blocks(clinic_id);

ALTER TABLE clinic_blocks ENABLE ROW LEVEL SECURITY;

-- Solo vet_admin de la clínica gestiona sus bloqueos
CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 4. clinic_join_requests — vets que solicitan unirse a una clínica
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_join_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id    UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  message      TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (vet_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_join_requests_clinic_id
  ON clinic_join_requests(clinic_id);

ALTER TABLE clinic_join_requests ENABLE ROW LEVEL SECURITY;

-- El vet ve sus propias solicitudes
CREATE POLICY "vet_sees_own_join_requests" ON clinic_join_requests
  FOR SELECT
  USING (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet admin gestiona las solicitudes de su clínica
CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- El vet puede crear solicitudes para sí mismo
CREATE POLICY "vet_creates_join_requests" ON clinic_join_requests
  FOR INSERT
  WITH CHECK (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid())
        IN ('veterinarian', 'vet_admin')
  );
