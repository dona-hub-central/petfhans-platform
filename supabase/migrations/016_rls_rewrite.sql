-- 016_rls_rewrite.sql
-- Reescritura de 13 políticas RLS para soporte multi-clínica.
-- MANTIENE get_user_clinic_id() activa — no la dropea.
-- Después de aplicar: verificar con la query de conteo al final.

-- ──────────────────────────────────────────────────────────────
-- 1. CLINICS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven su propia clínica" ON clinics;

CREATE POLICY "Usuarios ven su propia clínica" ON clinics
  FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 2. PROFILES
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven perfiles de su clínica" ON profiles;

CREATE POLICY "Usuarios ven perfiles de su clínica" ON profiles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR clinic_id IN (
      SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 3 y 4. PETS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets ven mascotas de su clínica" ON pets;
DROP POLICY IF EXISTS "Vets gestionan mascotas de su clínica" ON pets;

CREATE POLICY "Vets ven mascotas de su clínica" ON pets
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Vets gestionan mascotas de su clínica" ON pets
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 5. MEDICAL_RECORDS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets gestionan historiales de su clínica" ON medical_records;

CREATE POLICY "Vets gestionan historiales de su clínica" ON medical_records
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 6. INVITATIONS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets admin gestionan invitaciones" ON invitations;

CREATE POLICY "Vets admin gestionan invitaciones" ON invitations
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 7. HABIT_LOGS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets ven hábitos de mascotas de su clínica" ON habit_logs;

CREATE POLICY "Vets ven hábitos de mascotas de su clínica" ON habit_logs
  FOR SELECT
  USING (
    pet_id IN (
      SELECT id FROM pets WHERE clinic_id IN (
        SELECT clinic_id FROM profile_clinics
        WHERE user_id = auth.uid()
        AND role IN ('vet_admin', 'veterinarian')
      )
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 8. PET_FILES
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vet gestiona archivos de su clinica" ON pet_files;

CREATE POLICY "Vet gestiona archivos de su clinica" ON pet_files
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 9. PET_ACCESS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_manages_pet_access" ON pet_access;

CREATE POLICY "vet_manages_pet_access" ON pet_access
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 10. APPOINTMENTS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clinic_staff_appointments" ON appointments;

CREATE POLICY "clinic_staff_appointments" ON appointments
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 11. CARE_REQUESTS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_care_requests" ON care_requests;

CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 12. CLINIC_BLOCKS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_blocks" ON clinic_blocks;

CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 13. CLINIC_JOIN_REQUESTS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_join_requests" ON clinic_join_requests;

CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
