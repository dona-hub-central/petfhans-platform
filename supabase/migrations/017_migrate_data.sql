-- 017_migrate_data.sql
-- Pobla profile_clinics copiando datos de profiles.clinic_id.
-- Idempotente: ON CONFLICT DO NOTHING — se puede ejecutar varias veces.
-- Rollbackable: truncar profile_clinics o borrar por rango de created_at.
-- Prerequisito: 015 y 016 aplicadas y verificadas.

INSERT INTO profile_clinics (user_id, clinic_id, role)
SELECT
  p.user_id,
  p.clinic_id,
  p.role
FROM profiles p
WHERE p.clinic_id IS NOT NULL
  AND p.role IN ('vet_admin', 'veterinarian', 'pet_owner')
ON CONFLICT (user_id, clinic_id) DO NOTHING;
