-- 020_drop_scalar_clinic_fn.sql
-- Elimina la función helper get_user_clinic_id() — ninguna política la usa ya.
-- Prerequisito: 016 aplicada (RLS reescrita), 0 políticas la referencian.

DROP FUNCTION IF EXISTS get_user_clinic_id();

-- Verificación esperada:
-- SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_user_clinic_id';  -- debe ser 0
