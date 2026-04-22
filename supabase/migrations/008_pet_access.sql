-- 008_pet_access.sql
-- Tabla de acceso explícito: quién puede ver qué mascotas
-- Reemplaza la lógica implícita "pet_owner de la clínica ve todas las mascotas"

CREATE TABLE IF NOT EXISTS pet_access (
  owner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id     UUID NOT NULL REFERENCES pets(id)     ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES clinics(id),
  linked_by  UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, pet_id)
);

ALTER TABLE pet_access ENABLE ROW LEVEL SECURITY;

-- vet_admin y veterinarian gestionan los accesos de su clínica
CREATE POLICY "vet_manages_pet_access" ON pet_access
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid())
      IN ('vet_admin', 'veterinarian')
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- pet_owner solo ve sus propios accesos
CREATE POLICY "owner_sees_own_access" ON pet_access
  FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Actualizar RLS de pets: pet_owner solo ve mascotas en pet_access
DROP POLICY IF EXISTS "pet_owner_reads_pets" ON pets;

CREATE POLICY "pets_access_policy" ON pets
  FOR SELECT
  USING (
    -- Vets y admins ven todas las mascotas de su clínica
    (
      (SELECT role FROM profiles WHERE user_id = auth.uid())
        IN ('superadmin', 'vet_admin', 'veterinarian')
      AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    -- Pet owners solo ven mascotas autorizadas explícitamente
    (
      (SELECT id FROM profiles WHERE user_id = auth.uid()) IN (
        SELECT pa.owner_id FROM pet_access pa WHERE pa.pet_id = pets.id
      )
    )
  );
