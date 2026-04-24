# Fase C.1 — Tablas nuevas del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las tablas y columnas nuevas que necesita el marketplace en Supabase.
**Rama:** Develop
**Solo SQL — no tocar src/**
**Output:** `supabase/migrations/017_marketplace_tables.sql` + ejecutar en Supabase Dashboard

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md
prompts/marketplace-coste-tecnico.md
```

Verifica que las migraciones anteriores existen:
```bash
ls supabase/migrations/ | sort
# Debe mostrar 001 hasta 013
```

---

## Tarea — crear `supabase/migrations/017_marketplace_tables.sql`

Crea el archivo con exactamente este contenido:

```sql
-- 017_marketplace_tables.sql
-- Tablas y columnas nuevas para el módulo marketplace
-- No dependen de profile_clinics — pueden aplicarse antes de Fase B

-- ─────────────────────────────────────────────────────────────────────
-- 1. Columnas nuevas en clinics (perfil público del marketplace)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS verified        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_profile  JSONB,
  ADD COLUMN IF NOT EXISTS rating_avg      NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS rating_count    INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN clinics.verified       IS 'Badge de verificación otorgado manualmente por superadmin';
COMMENT ON COLUMN clinics.public_profile IS 'JSON con descripción, especialidades, horarios, foto de portada';
COMMENT ON COLUMN clinics.rating_avg     IS 'Promedio calculado de valoraciones de dueños';
COMMENT ON COLUMN clinics.rating_count   IS 'Total de valoraciones recibidas';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Tabla care_requests — dueño solicita atención en una clínica
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS care_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id       UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name        TEXT,
  pet_species     TEXT,
  reason          TEXT,
  preferred_vet   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','blocked')),
  response_note   TEXT,
  responded_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_requests_clinic    ON care_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_care_requests_requester ON care_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_care_requests_status    ON care_requests(status);

ALTER TABLE care_requests ENABLE ROW LEVEL SECURITY;

-- Dueño ve sus propias solicitudes
CREATE POLICY "owner_sees_own_care_requests" ON care_requests
  FOR SELECT
  USING (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Dueño crea solicitudes
CREATE POLICY "owner_creates_care_requests" ON care_requests
  FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet admin de la clínica gestiona solicitudes de su clínica
CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- Superadmin ve todo
CREATE POLICY "superadmin_care_requests" ON care_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. Tabla clinic_blocks — bloqueos privados clínica-dueño
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_blocks_clinic  ON clinic_blocks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_blocks_profile ON clinic_blocks(profile_id);

ALTER TABLE clinic_blocks ENABLE ROW LEVEL SECURITY;

-- Vet admin gestiona bloqueos de su clínica
CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- Superadmin ve todo
CREATE POLICY "superadmin_clinic_blocks" ON clinic_blocks
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ─────────────────────────────────────────────────────────────────────
-- 4. Tabla clinic_join_requests — vet solicita unirse a clínica
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_join_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id    UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','rejected')),
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vet_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_clinic ON clinic_join_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_vet    ON clinic_join_requests(vet_id);

ALTER TABLE clinic_join_requests ENABLE ROW LEVEL SECURITY;

-- Vet ve sus propias solicitudes
CREATE POLICY "vet_sees_own_join_requests" ON clinic_join_requests
  FOR SELECT
  USING (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet crea solicitudes
CREATE POLICY "vet_creates_join_requests" ON clinic_join_requests
  FOR INSERT
  WITH CHECK (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid())
        IN ('veterinarian', 'vet_admin')
  );

-- Vet admin de la clínica gestiona solicitudes entrantes
CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- Superadmin ve todo
CREATE POLICY "superadmin_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
```

---

## Pasos después de crear el archivo

### 1. Verifica que TypeScript no fue afectado
```bash
npx tsc --noEmit
# Debe pasar sin cambios — el SQL no toca src/
```

### 2. Ejecuta la migración en Supabase Dashboard → SQL Editor
Copia y pega el contenido completo. Verifica que no hay errores.

### 3. Confirma que las tablas existen
Ejecuta en el SQL Editor de Supabase:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('care_requests', 'clinic_blocks', 'clinic_join_requests')
ORDER BY table_name;
-- Debe devolver 3 filas

SELECT column_name FROM information_schema.columns
WHERE table_name = 'clinics'
AND column_name IN ('verified', 'public_profile', 'rating_avg', 'rating_count');
-- Debe devolver 4 filas
```

### 4. Commit y push
```bash
git add supabase/migrations/017_marketplace_tables.sql
git commit -m "feat(C1): marketplace tables — care_requests, clinic_blocks, clinic_join_requests"
git push origin Develop
```

---

## Restricciones

- ❌ No tocar ningún archivo en `src/`
- ❌ No modificar migraciones 001–013
- ❌ No instalar dependencias
- ✅ Solo crear `supabase/migrations/017_marketplace_tables.sql`
- ✅ Ejecutar en Supabase y confirmar que las 3 tablas y 4 columnas existen
- ✅ `npx tsc --noEmit` debe pasar sin errores

**La Fase C.2 solo puede arrancar después de confirmar que las tablas existen en Supabase.**
