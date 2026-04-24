# Fase C — Migraciones del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las tablas y columnas nuevas del marketplace en Supabase.  
**Rama:** Develop  
**Impacto en código existente:** NINGUNO — solo SQL aditivo  
**No modifica:** ningún archivo en `src/`, ninguna migración existente

---

## Antes de empezar

Lee estos archivos:

```
prompts/marketplace-multiclínica.md   ← spec confirmada del producto
prompts/marketplace-coste-tecnico.md  ← sección FASE C
```

Verifica que las migraciones anteriores existen:

```bash
ls supabase/migrations/ | sort
# Debe mostrar 001 al 013 como mínimo
# La siguiente migración disponible es 014_marketplace_tables.sql
```

---

## Tarea — Crear un único archivo de migración

Crea `supabase/migrations/014_marketplace_tables.sql` con exactamente este contenido:

```sql
-- 014_marketplace_tables.sql
-- Tablas y columnas nuevas para el módulo de marketplace
-- No modifica ninguna tabla existente excepto añadir columnas a clinics
-- No afecta profiles.clinic_id ni ninguna RLS existente

-- ─────────────────────────────────────────────────────────────
-- 1. Columnas nuevas en clinics (aditivas, sin breaking changes)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS verified       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_profile JSONB;

COMMENT ON COLUMN clinics.verified IS
  'Badge de verificación otorgado manualmente por el superadmin';

COMMENT ON COLUMN clinics.public_profile IS
  'Perfil público de la clínica en el marketplace: descripcion, especialidades, cover_url, horarios';

-- ─────────────────────────────────────────────────────────────
-- 2. care_requests — solicitudes de atención del dueño a una clínica
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS care_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id       UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  pet_name        TEXT,
  pet_species     TEXT,
  reason          TEXT,
  preferred_vet_id UUID       REFERENCES profiles(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  retry_after     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_care_requests_clinic_id
  ON care_requests(clinic_id);

CREATE INDEX IF NOT EXISTS idx_care_requests_requester_id
  ON care_requests(requester_id);

ALTER TABLE care_requests ENABLE ROW LEVEL SECURITY;

-- El dueño ve sus propias solicitudes
CREATE POLICY "owner_sees_own_care_requests" ON care_requests
  FOR SELECT
  USING (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet admin ve las solicitudes de su clínica
CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- El dueño puede crear solicitudes
CREATE POLICY "owner_creates_care_requests" ON care_requests
  FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'pet_owner'
  );

-- ─────────────────────────────────────────────────────────────
-- 3. clinic_blocks — bloqueos privados entre clínica y dueño
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_blocks_clinic_id
  ON clinic_blocks(clinic_id);

ALTER TABLE clinic_blocks ENABLE ROW LEVEL SECURITY;

-- Solo vet_admin de la clínica gestiona sus bloqueos
CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 4. clinic_join_requests — vets que solicitan unirse a una clínica
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_join_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id   UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (vet_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_join_requests_clinic_id
  ON clinic_join_requests(clinic_id);

ALTER TABLE clinic_join_requests ENABLE ROW LEVEL SECURITY;

-- El vet ve sus propias solicitudes
CREATE POLICY "vet_sees_own_join_requests" ON clinic_join_requests
  FOR SELECT
  USING (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vet admin gestiona las solicitudes de su clínica
CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- El vet puede crear solicitudes para sí mismo
CREATE POLICY "vet_creates_join_requests" ON clinic_join_requests
  FOR INSERT
  WITH CHECK (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid())
        IN ('veterinarian', 'vet_admin')
  );
```

---

## Verificación antes de commitear

```bash
# TypeScript no debería tener errores — no tocamos src/
npx tsc --noEmit

# El archivo existe y tiene contenido
wc -l supabase/migrations/014_marketplace_tables.sql
# Debe ser > 80 líneas

# No hay cambios en src/
git diff --name-only | grep "^src/"
# Debe estar vacío
```

## Commit

```bash
git add supabase/migrations/014_marketplace_tables.sql
git commit -m "feat(marketplace): add care_requests, clinic_blocks, clinic_join_requests tables + clinics.verified/public_profile columns"
git push origin Develop
```

---

## Después del commit — ejecutar en Supabase

Esta migración **debe ejecutarse manualmente en el Supabase Dashboard**
antes de que las API routes del marketplace puedan usarla:

```
Supabase Dashboard → SQL Editor
→ pegar el contenido de 014_marketplace_tables.sql
→ Run
```

Verificación post-ejecución:

```sql
-- Confirmar tablas creadas
SELECT tablename FROM pg_tables
WHERE tablename IN (
  'care_requests', 'clinic_blocks', 'clinic_join_requests'
);
-- Debe devolver 3 filas

-- Confirmar columnas en clinics
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clinics'
  AND column_name IN ('verified', 'public_profile');
-- Debe devolver 2 filas

-- Confirmar RLS activo
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN (
  'care_requests', 'clinic_blocks', 'clinic_join_requests'
);
-- rowsecurity debe ser TRUE en las 3 tablas
```

---

## Restricciones absolutas

- ❌ No modificar migraciones 001-013
- ❌ No tocar ningún archivo en `src/`
- ❌ No tocar `profiles.clinic_id` ni las RLS existentes
- ✅ Solo crear `014_marketplace_tables.sql`
- ✅ `npx tsc --noEmit` debe pasar antes del commit
- ✅ Confirmar que `git diff --name-only | grep '^src/'` está vacío
