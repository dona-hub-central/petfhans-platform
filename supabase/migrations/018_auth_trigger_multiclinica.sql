-- 018_auth_trigger_multiclinica.sql
-- Actualiza handle_new_user() para que al crear un usuario también inserte
-- en profile_clinics. Deja de depender de profiles.clinic_id como única fuente.
-- profiles.clinic_id se mantiene por compatibilidad — se nullifica en 019.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_clinic_id UUID;
  v_role TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  v_clinic_id := (NEW.raw_user_meta_data->>'clinic_id')::UUID;

  IF v_role IS NOT NULL THEN
    INSERT INTO profiles (user_id, role, full_name, email, clinic_id)
    VALUES (
      NEW.id,
      v_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      v_clinic_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- También insertar en profile_clinics si hay clinic_id
    IF v_clinic_id IS NOT NULL AND v_role IN ('vet_admin', 'veterinarian', 'pet_owner') THEN
      INSERT INTO profile_clinics (user_id, clinic_id, role)
      VALUES (NEW.id, v_clinic_id, v_role)
      ON CONFLICT (user_id, clinic_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
