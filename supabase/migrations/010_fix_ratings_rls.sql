-- 010_fix_ratings_rls.sql
-- Corrige RLS de appointment_ratings (cierra H-8)
-- La política anterior usaba WITH CHECK (rated_by = 'owner') sin verificar
-- que el usuario es el propietario real de la cita

DROP POLICY IF EXISTS "rating_insert" ON appointment_ratings;
DROP POLICY IF EXISTS "owner_can_rate" ON appointment_ratings;
DROP POLICY IF EXISTS "owners can rate their appointments" ON appointment_ratings;

CREATE POLICY "owner_rates_own_appointment" ON appointment_ratings
  FOR INSERT
  WITH CHECK (
    -- El usuario autenticado es el dueño de la mascota de la cita
    (SELECT id FROM profiles WHERE user_id = auth.uid()) IN (
      SELECT pa.owner_id
      FROM appointments a
      JOIN pet_access pa ON pa.pet_id = a.pet_id
      WHERE a.id = appointment_ratings.appointment_id
    )
  );
