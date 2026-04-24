-- Permite que cada usuario actualice su propio perfil
-- independientemente de clinic_id
-- Mismo patrón que 012 pero para UPDATE

DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON profiles;

CREATE POLICY "Usuarios actualizan su propio perfil" ON profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
