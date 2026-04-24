# Fase C.1 — Tablas nuevas del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las 4 tablas/columnas que el marketplace necesita en Supabase.
**Solo SQL — no tocar ningún archivo de `src/`.**
**Migración:** `017_marketplace_tables.sql`

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md   ← spec confirmada del feature
supabase/migrations/011_appointments_rls.sql  ← referencia de estilo SQL
```

Verifica la última migración existente:
```bash
ls supabase/migrations/ | sort | tail -5
```
El archivo nuevo debe ser `017_marketplace_tables.sql`.
Si el último número es diferente, ajusta el nombre antes de continuar.

---

## Tarea — Crear `supabase/migrations/017_marketplace_tables.sql`

El archivo debe contener exactamente estas 4 secciones en orden:

### Sección 1 — Columnas nuevas en `clinics`

```sql
-- Columnas nuevas en clinics para el marketplace
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS verified       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_profile JSONB;

COMMENT ON COLUMN clinics.verified       IS 'Badge de verificación otorgado manualmente por superadmin';
COMMENT ON COLUMN clinics.public_profile IS 'Perfil público de la clínica: descripción, especialidades, horarios, foto portada';
```

### Sección 2 — Tabla `care_requests`

```sql
-- Solicitudes de atención: un dueño solicita ser atendido en una clínica
CREATE TABLE IF NOT EXISTS care_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id     UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  pet_name      TEXT,
  pet_species   TEXT,
  reason        TEXT,
  preferred_vet UUID        REFERENCES profiles(id),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','rejected','blocked')),
  rejection_note TEXT,
  retry_after   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_care_requests_clinic    ON care_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_care_requests_requester ON care_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_care_requests_status    ON care_requests(status);

ALTER TABLE care_requests ENABLE ROW LEVEL SECURITY;

-- El dueño ve sus propias solicitudes
CREATE POLICY "owner_sees_own_care_requests" ON care_requests
  FOR SELECT
  USING (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- El dueño puede crear solicitudes
CREATE POLICY "owner_creates_care_requests" ON care_requests
  FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'pet_owner'
  );

-- vet_admin gestiona las solicitudes de su clínica
CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- superadmin ve todo
CREATE POLICY "superadmin_care_requests" ON care_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
```

### Sección 3 — Tabla `clinic_join_requests`

```sql
-- Solicitudes de incorporación: un vet solicita unirse a una clínica
CREATE TABLE IF NOT EXISTS clinic_join_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id   UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (vet_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_join_requests_clinic ON clinic_join_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_join_requests_vet    ON clinic_join_requests(vet_id);

ALTER TABLE clinic_join_requests ENABLE ROW LEVEL SECURITY;

-- El vet ve sus propias solicitudes
CREATE POLICY "vet_sees_own_join_requests" ON clinic_join_requests
  FOR SELECT
  USING (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- El vet puede crear solicitudes
CREATE POLICY "vet_creates_join_requests" ON clinic_join_requests
  FOR INSERT
  WITH CHECK (
    vet_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('vet_admin','veterinarian')
  );

-- vet_admin gestiona las solicitudes hacia su clínica
CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- superadmin ve todo
CREATE POLICY "superadmin_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
```

### Sección 4 — Tabla `clinic_blocks`

```sql
-- Bloqueos: una clínica bloquea a un dueño específico
-- El bloqueo es privado — otras clínicas no lo ven
CREATE TABLE IF NOT EXISTS clinic_blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  UNIQUE (clinic_id, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_blocks_clinic ON clinic_blocks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_blocks_owner  ON clinic_blocks(owner_id);

ALTER TABLE clinic_blocks ENABLE ROW LEVEL SECURITY;

-- Solo vet_admin de la clínica ve y gestiona sus bloqueos
CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    clinic_id = get_user_clinic_id()
    AND (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
  );

-- El owner puede verificar si está bloqueado (para deshabilitar el CTA en UI)
CREATE POLICY "owner_checks_own_blocks" ON clinic_blocks
  FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- superadmin ve todo
CREATE POLICY "superadmin_blocks" ON clinic_blocks
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
```

---

## Verificación antes de ejecutar

```bash
# Contar las secciones del archivo
grep -c "CREATE TABLE\|ALTER TABLE" supabase/migrations/017_marketplace_tables.sql
# Debe ser >= 4

# TypeScript no debe romperse (no hay cambios en src/)
npx tsc --noEmit
```

---

## Ejecución en Supabase

Este archivo NO se ejecuta automáticamente. Debes ejecutarlo manualmente:

1. Abre Supabase Dashboard → SQL Editor
2. Pega el contenido completo de `017_marketplace_tables.sql`
3. Ejecuta y verifica que no hay errores
4. Confirma con:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('care_requests','clinic_join_requests','clinic_blocks')
ORDER BY table_name;
-- Debe devolver 3 filas

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'clinics'
  AND column_name IN ('verified','public_profile');
-- Debe devolver 2 filas
```

---

## Commit

```bash
git add supabase/migrations/017_marketplace_tables.sql
git commit -m "feat(C.1): marketplace tables — care_requests, clinic_join_requests, clinic_blocks, clinics.verified"
git push origin Develop
```

---

## Restricciones

- ❌ No tocar ningún archivo de `src/`
- ❌ No modificar migraciones 001–016
- ❌ No crear API routes en esta sesión — eso es C.2
- ✅ Solo crear `supabase/migrations/017_marketplace_tables.sql`
- ✅ `npx tsc --noEmit` debe pasar sin errores

---

## Qué viene después de C.1

Cuando las tablas estén creadas y verificadas en Supabase:

```
C.2 → API routes de solo lectura
      GET /api/marketplace/clinics
      GET /api/marketplace/clinics/[slug]
      GET /api/marketplace/vets

C.3 → UI del marketplace
      /marketplace/clinicas
      /marketplace/clinicas/[slug]
      /marketplace/veterinarios

C.4 → El handshake
      POST /api/care-requests
      POST /api/clinic-join-requests
```
