-- Permite que cada usuario siempre pueda leer su propio perfil
-- independientemente de clinic_id
-- Esto corrige el caso donde clinic_id = NULL bloquea la lectura del propio perfil

DROP POLICY IF EXISTS "Usuarios ven perfiles de su clínica" ON profiles;

CREATE POLICY "Usuarios ven perfiles de su clínica" ON profiles
  FOR SELECT USING (
    user_id = auth.uid()                    -- siempre puede ver el suyo propio
    OR
    clinic_id = get_user_clinic_id()        -- y los de su clínica
  );
