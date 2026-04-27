-- 021_pets_clinic_optional.sql
-- Allows pets to exist without a clinic (self-registered by owner).
-- Also allows pet_access rows without a clinic (direct owner-to-pet link).
-- Prerequisite: 020 applied.

ALTER TABLE pets ALTER COLUMN clinic_id DROP NOT NULL;
ALTER TABLE pet_access ALTER COLUMN clinic_id DROP NOT NULL;
