-- 015_profile_clinics.sql
-- Tabla de pertenencia multi-clínica.
-- Reemplazará profiles.clinic_id (escalar) cuando Fase B esté completa.
-- NO elimina profiles.clinic_id — eso ocurre en B.6 (deprecación).
-- NO toca ninguna política RLS existente — eso es 016.

CREATE TABLE IF NOT EXISTS profile_clinics (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id  UUID        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  role       TEXT        NOT NULL
             CHECK (role IN ('vet_admin', 'veterinarian', 'pet_owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_clinics_user_id
  ON profile_clinics(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_clinics_clinic_id
  ON profile_clinics(clinic_id);

ALTER TABLE profile_clinics ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo sus propias membresías
CREATE POLICY "user_sees_own_memberships" ON profile_clinics
  FOR SELECT
  USING (user_id = auth.uid());

-- Superadmin gestiona todo
CREATE POLICY "superadmin_profile_clinics" ON profile_clinics
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- Vet admin ve y gestiona membresías de su clínica
CREATE POLICY "vet_admin_manages_clinic_members" ON profile_clinics
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );
