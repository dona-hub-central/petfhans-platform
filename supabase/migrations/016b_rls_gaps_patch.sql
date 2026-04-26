-- 016b_rls_gaps_patch.sql
-- Parche post-016: elimina políticas con nombres distintos a los esperados
-- y cubre clinic_schedules (tabla omitida en 016).
--
-- PREREQUISITOS: 015 y 016 aplicadas y verificadas.
-- Ejecutar EN ORDEN inmediatamente después de 016.
--
-- Después de este parche la query de conteo debe devolver 1 (profile_clinics,
-- aceptable hasta B.6 cuando se nullifica profiles.clinic_id).

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. APPOINTMENTS — eliminar política antigua (016 ya creó clinic_staff_appointments)
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vet ve citas de su clinica" ON appointments;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. INVITATIONS — eliminar política antigua (016 ya creó "Vets admin gestionan invitaciones")
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_invitations" ON invitations;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CLINIC_SCHEDULES — tabla no cubierta en 016
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vet gestiona horarios de su clinica" ON clinic_schedules;

CREATE POLICY "Vet gestiona horarios de su clinica" ON clinic_schedules
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. PETS — pets_access_policy combina acceso vet (cubierto por 016) y dueño.
-- Se elimina la política escalar y se crea solo la parte del dueño de mascota.
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pets_access_policy" ON pets;

-- Acceso del dueño a sus propias mascotas vía pet_access
CREATE POLICY "owner_sees_own_pets" ON pets
  FOR SELECT
  USING (
    (SELECT id FROM profiles WHERE user_id = auth.uid()) IN (
      SELECT owner_id FROM pet_access WHERE pet_id = pets.id
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (ejecutar después de aplicar)
-- ──────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname FROM pg_policies
-- WHERE qual LIKE '%get_user_clinic_id%'
--    OR qual LIKE '%profiles.clinic_id%'
-- ORDER BY tablename;
-- Resultado esperado: 1 fila (profile_clinics / vet_admin_manages_clinic_members)
-- Esa política es aceptable hasta B.6 — profiles.clinic_id sigue poblado.
