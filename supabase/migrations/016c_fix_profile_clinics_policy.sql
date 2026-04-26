-- 016c_fix_profile_clinics_policy.sql
-- Reescribe vet_admin_manages_clinic_members para eliminar la referencia
-- a profiles.clinic_id (escalar). Sin esta corrección, la política rompería
-- cuando 019 nullifique profiles.clinic_id.
--
-- Patrón sin recursión: el check de clínica se hace desde profiles.role,
-- no desde profile_clinics (evita infinite recursion en RLS self-referencial).
-- Nivel de acceso: cualquier vet_admin puede gestionar membresías de cualquier
-- clínica — aceptable en fase de transición B, a restringir en B.6 si se requiere.
--
-- PREREQUISITO: 016b aplicada (count de escalares = 1, esta migración lo lleva a 0).

DROP POLICY IF EXISTS "vet_admin_manages_clinic_members" ON profile_clinics;

CREATE POLICY "vet_admin_manages_clinic_members" ON profile_clinics
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('vet_admin', 'superadmin')
  );

-- Verificación esperada:
-- SELECT COUNT(*) FROM pg_policies
-- WHERE qual LIKE '%get_user_clinic_id%' OR qual LIKE '%profiles.clinic_id%';
-- Resultado: 0
