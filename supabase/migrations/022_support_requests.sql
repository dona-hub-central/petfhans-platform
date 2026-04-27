-- 022_support_requests.sql
-- Solicitudes de soporte: usuarios pueden pedir creación de clínica + asignación
-- como vet_admin, o cualquier otra consulta de soporte. Reduce fricción del flujo
-- onboarding manual mientras sigue requiriendo verificación de superadmin.

CREATE TABLE IF NOT EXISTS support_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('clinic_creation', 'general')),
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  clinic_name   TEXT,
  contact_phone TEXT,
  contact_email TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  admin_notes   TEXT,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id
  ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status
  ON support_requests(status);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede crear su propia solicitud
CREATE POLICY "users_create_own_request" ON support_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuario ve sus propias solicitudes; superadmin ve todas
CREATE POLICY "users_see_own_request" ON support_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- Solo superadmin actualiza (cambio de status, notas)
CREATE POLICY "superadmin_updates_request" ON support_requests
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin');
