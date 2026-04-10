-- =============================================
-- Trigger: crear perfil automático al registrarse
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear perfil si viene metadata de rol
  -- (invitaciones y registro manual lo envían)
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO profiles (user_id, role, full_name, email, clinic_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'role',
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      (NEW.raw_user_meta_data->>'clinic_id')::UUID
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
