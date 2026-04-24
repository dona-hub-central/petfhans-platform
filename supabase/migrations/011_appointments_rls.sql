-- 011_appointments_rls.sql
-- Añade RLS básica a appointments (tabla sin políticas actualmente)

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Vets y admins ven citas de su clínica
CREATE POLICY "clinic_staff_appointments" ON appointments
  FOR ALL
  USING (
    clinic_id = (
      SELECT clinic_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
      LIMIT 1
    )
  );

-- Pet owners ven sus propias citas via pet_access
CREATE POLICY "owner_appointments" ON appointments
  FOR SELECT
  USING (
    pet_id IN (
      SELECT pet_id FROM pet_access
      WHERE owner_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Superadmin ve todo
CREATE POLICY "superadmin_appointments" ON appointments
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
