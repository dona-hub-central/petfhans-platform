-- 019_nullify_profiles_clinic_id.sql
-- Nullifica profiles.clinic_id — profile_clinics es ahora la única fuente de verdad.
-- Prerequisito: profile_clinics poblada (017), trigger actualizado (018),
-- cero referencias a profiles.clinic_id como scope en el código.

UPDATE profiles SET clinic_id = NULL WHERE clinic_id IS NOT NULL;

-- Verificación esperada:
-- SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;  -- debe ser 0
