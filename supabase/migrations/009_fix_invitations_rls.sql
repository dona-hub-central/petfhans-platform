-- 009_fix_invitations_rls.sql
-- Separa permisos de vet_admin y veterinarian sobre invitaciones (cierra H-11)
-- Añade columna pet_ids a invitations (requerida por accept-invite y create-invitation)

-- Añadir pet_ids a invitations para registrar mascotas autorizadas al pet_owner
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS pet_ids UUID[] NOT NULL DEFAULT '{}';

-- Eliminar política existente demasiado permisiva
DROP POLICY IF EXISTS "Vets admin gestionan invitaciones" ON invitations;
DROP POLICY IF EXISTS "vet_manages_invitations" ON invitations;
DROP POLICY IF EXISTS "vet_can_manage_invitations" ON invitations;

-- vet_admin: gestiona TODAS las invitaciones de su clínica
CREATE POLICY "vet_admin_manages_invitations" ON invitations
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- veterinarian: solo VE las invitaciones que él creó con rol pet_owner
CREATE POLICY "vet_sees_own_pet_owner_invitations" ON invitations
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'veterinarian'
    AND created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND role = 'pet_owner'
  );
