# Fase B.1 — Migraciones SQL: profile_clinics + RLS rewrite + migración de datos
## Sesión independiente de Claude Code — SOLO SQL, no tocar src/

**Objetivo:** Crear la tabla `profile_clinics`, reescribir las 13 políticas RLS que
usan `get_user_clinic_id()` para soportar multi-clínica, y poblar la tabla con los
datos actuales de `profiles.clinic_id`.

**Rama:** Develop  
**Riesgo:** ALTO — cambios irreversibles en esquema y RLS de producción  
**Prerequisito:** Fases A y C completadas. Migraciones 001–014 aplicadas.

---

## Antes de empezar — verificaciones obligatorias

### 1. Lee estos documentos completos
```
prompts/marketplace-multiclínica.md
prompts/marketplace-coste-tecnico.md
skills-ai/security-invitation-flow/SKILL.md
```

### 2. Verifica el estado de las migraciones
```bash
ls supabase/migrations/ | sort
# Debe mostrar 001 hasta 014, sin gaps
```

### 3. Toma un snapshot de Supabase antes de cada migración
En Supabase Dashboard → Settings → Backups → "Create backup" antes de ejecutar
**cada uno** de los tres archivos SQL. Si no hay backups disponibles en tu plan,
documenta el timestamp exacto del inicio de cada migración para acotar el rollback.

### 4. Anota el timestamp de inicio
```sql
-- Ejecuta en SQL Editor de Supabase y anota el resultado antes de cada migración
SELECT NOW(); -- guarda este valor, lo necesitarás para el rollback si algo falla
```

---

## MIGRACIÓN 1 de 3 — `015_profile_clinics.sql`

### Crea el archivo
`supabase/migrations/015_profile_clinics.sql` con este contenido exacto:

```sql
-- 015_profile_clinics.sql
-- Tabla de pertenencia multi-clínica.
-- Reemplazará profiles.clinic_id (escalar) cuando Fase B esté completa.
-- NO elimina profiles.clinic_id — eso ocurre en B.6 (deprecación).
-- NO toca ninguna política RLS existente — eso es 016.

CREATE TABLE IF NOT EXISTS profile_clinics (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id  UUID        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  role       TEXT        NOT NULL
             CHECK (role IN ('vet_admin', 'veterinarian', 'pet_owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_clinics_user_id
  ON profile_clinics(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_clinics_clinic_id
  ON profile_clinics(clinic_id);

ALTER TABLE profile_clinics ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo sus propias membresías
CREATE POLICY "user_sees_own_memberships" ON profile_clinics
  FOR SELECT
  USING (user_id = auth.uid());

-- Superadmin gestiona todo
CREATE POLICY "superadmin_profile_clinics" ON profile_clinics
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- Vet admin ve y gestiona membresías de su clínica
CREATE POLICY "vet_admin_manages_clinic_members" ON profile_clinics
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );
```

### Ejecuta en Supabase Dashboard → SQL Editor
Copia y pega el contenido. Verifica que no hay errores.

### Verifica
```sql
-- Debe devolver 1 fila
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profile_clinics';

-- Debe devolver 3 políticas
SELECT policyname FROM pg_policies WHERE tablename = 'profile_clinics';
```

### Script de rollback para 015 (guárdalo antes de continuar)
```sql
-- ROLLBACK 015 — ejecutar solo si hay error y necesitas revertir
DROP TABLE IF EXISTS profile_clinics CASCADE;
-- Verifica: SELECT EXISTS (
--   SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_clinics'
-- ); -- debe devolver false
```

### Commit
```bash
git add supabase/migrations/015_profile_clinics.sql
git commit -m "feat(B1): crear tabla profile_clinics con RLS básica"
git push origin Develop
```

---

## MIGRACIÓN 2 de 3 — `016_rls_rewrite.sql`

⚠️ **Toma otro snapshot de Supabase antes de ejecutar esta migración.**

Esta migración reescribe 13 políticas RLS que usan `profiles.clinic_id` (escalar)
para usar `profile_clinics` (multi-clínica). La función `get_user_clinic_id()`
**NO se elimina** — otras partes del sistema aún la necesitan mientras dure Fase B.

### Crea el archivo
`supabase/migrations/016_rls_rewrite.sql` con este contenido exacto:

```sql
-- 016_rls_rewrite.sql
-- Reescritura de 13 políticas RLS para soporte multi-clínica.
-- MANTIENE get_user_clinic_id() activa — no la dropea.
-- Después de aplicar: verificar con la query de conteo al final.

-- ──────────────────────────────────────────────────────────────
-- 1. CLINICS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven su propia clínica" ON clinics;

CREATE POLICY "Usuarios ven su propia clínica" ON clinics
  FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 2. PROFILES
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios ven perfiles de su clínica" ON profiles;

CREATE POLICY "Usuarios ven perfiles de su clínica" ON profiles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR clinic_id IN (
      SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 3 y 4. PETS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets ven mascotas de su clínica" ON pets;
DROP POLICY IF EXISTS "Vets gestionan mascotas de su clínica" ON pets;

CREATE POLICY "Vets ven mascotas de su clínica" ON pets
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

CREATE POLICY "Vets gestionan mascotas de su clínica" ON pets
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 5. MEDICAL_RECORDS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets gestionan historiales de su clínica" ON medical_records;

CREATE POLICY "Vets gestionan historiales de su clínica" ON medical_records
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 6. INVITATIONS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets admin gestionan invitaciones" ON invitations;

CREATE POLICY "Vets admin gestionan invitaciones" ON invitations
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 7. HABIT_LOGS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vets ven hábitos de mascotas de su clínica" ON habit_logs;

CREATE POLICY "Vets ven hábitos de mascotas de su clínica" ON habit_logs
  FOR SELECT
  USING (
    pet_id IN (
      SELECT id FROM pets WHERE clinic_id IN (
        SELECT clinic_id FROM profile_clinics
        WHERE user_id = auth.uid()
        AND role IN ('vet_admin', 'veterinarian')
      )
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 8. PET_FILES
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vet gestiona archivos de su clinica" ON pet_files;

CREATE POLICY "Vet gestiona archivos de su clinica" ON pet_files
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 9. PET_ACCESS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_manages_pet_access" ON pet_access;

CREATE POLICY "vet_manages_pet_access" ON pet_access
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 10. APPOINTMENTS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clinic_staff_appointments" ON appointments;

CREATE POLICY "clinic_staff_appointments" ON appointments
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 11. CARE_REQUESTS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_care_requests" ON care_requests;

CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 12. CLINIC_BLOCKS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_blocks" ON clinic_blocks;

CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );

-- ──────────────────────────────────────────────────────────────
-- 13. CLINIC_JOIN_REQUESTS (creada en 014 — Fase C)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vet_admin_manages_join_requests" ON clinic_join_requests;

CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'superadmin'
  );
```

### Ejecuta en Supabase Dashboard → SQL Editor

### Verifica — CRÍTICO
```sql
-- Ninguna política debe referenciar get_user_clinic_id() al terminar
SELECT COUNT(*) AS politicas_con_scalar
FROM pg_policies
WHERE qual LIKE '%get_user_clinic_id%'
   OR qual LIKE '%profiles.clinic_id%';
-- Resultado esperado: 0

-- El total de políticas debe haber aumentado (13 reescritas)
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'clinics','profiles','pets','medical_records','invitations',
  'habit_logs','pet_files','pet_access','appointments',
  'care_requests','clinic_blocks','clinic_join_requests'
)
ORDER BY tablename, policyname;
```

### Script de rollback para 016 (guárdalo antes de continuar)
```sql
-- ROLLBACK 016 — restaura las 13 políticas originales con get_user_clinic_id()
-- Ejecutar solo si la verificación falla o hay errores de acceso.

-- 1. CLINICS
DROP POLICY IF EXISTS "Usuarios ven su propia clínica" ON clinics;
CREATE POLICY "Usuarios ven su propia clínica" ON clinics
  FOR SELECT USING (id = get_user_clinic_id());

-- 2. PROFILES
DROP POLICY IF EXISTS "Usuarios ven perfiles de su clínica" ON profiles;
CREATE POLICY "Usuarios ven perfiles de su clínica" ON profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_id = get_user_clinic_id()
  );

-- 3. PETS SELECT
DROP POLICY IF EXISTS "Vets ven mascotas de su clínica" ON pets;
CREATE POLICY "Vets ven mascotas de su clínica" ON pets
  FOR SELECT USING (
    clinic_id = get_user_clinic_id()
    AND get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- 4. PETS ALL
DROP POLICY IF EXISTS "Vets gestionan mascotas de su clínica" ON pets;
CREATE POLICY "Vets gestionan mascotas de su clínica" ON pets
  FOR ALL USING (
    clinic_id = get_user_clinic_id()
    AND get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- 5. MEDICAL_RECORDS
DROP POLICY IF EXISTS "Vets gestionan historiales de su clínica" ON medical_records;
CREATE POLICY "Vets gestionan historiales de su clínica" ON medical_records
  FOR ALL USING (
    clinic_id = get_user_clinic_id()
    AND get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- 6. INVITATIONS
DROP POLICY IF EXISTS "Vets admin gestionan invitaciones" ON invitations;
CREATE POLICY "Vets admin gestionan invitaciones" ON invitations
  FOR ALL USING (
    clinic_id = get_user_clinic_id()
    AND get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- 7. HABIT_LOGS
DROP POLICY IF EXISTS "Vets ven hábitos de mascotas de su clínica" ON habit_logs;
CREATE POLICY "Vets ven hábitos de mascotas de su clínica" ON habit_logs
  FOR SELECT USING (
    pet_id IN (SELECT id FROM pets WHERE clinic_id = get_user_clinic_id())
    AND get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- 8. PET_FILES
DROP POLICY IF EXISTS "Vet gestiona archivos de su clinica" ON pet_files;
CREATE POLICY "Vet gestiona archivos de su clinica" ON pet_files
  FOR ALL USING (clinic_id = get_user_clinic_id() OR get_user_role() = 'superadmin');

-- 9. PET_ACCESS
DROP POLICY IF EXISTS "vet_manages_pet_access" ON pet_access;
CREATE POLICY "vet_manages_pet_access" ON pet_access
  FOR ALL USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('vet_admin', 'veterinarian')
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- 10. APPOINTMENTS
DROP POLICY IF EXISTS "clinic_staff_appointments" ON appointments;
CREATE POLICY "clinic_staff_appointments" ON appointments
  FOR ALL USING (
    clinic_id = (
      SELECT clinic_id FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
      LIMIT 1
    )
  );

-- 11. CARE_REQUESTS
DROP POLICY IF EXISTS "vet_admin_manages_care_requests" ON care_requests;
CREATE POLICY "vet_admin_manages_care_requests" ON care_requests
  FOR ALL USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- 12. CLINIC_BLOCKS
DROP POLICY IF EXISTS "vet_admin_manages_blocks" ON clinic_blocks;
CREATE POLICY "vet_admin_manages_blocks" ON clinic_blocks
  FOR ALL USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- 13. CLINIC_JOIN_REQUESTS
DROP POLICY IF EXISTS "vet_admin_manages_join_requests" ON clinic_join_requests;
CREATE POLICY "vet_admin_manages_join_requests" ON clinic_join_requests
  FOR ALL USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );
```

### Commit
```bash
git add supabase/migrations/016_rls_rewrite.sql
git commit -m "feat(B1): reescribir 13 políticas RLS para soporte multi-clínica"
git push origin Develop
```

---

## MIGRACIÓN 3 de 3 — `017_migrate_data.sql`

⚠️ **Toma otro snapshot de Supabase antes de ejecutar esta migración.**

### Anota el COUNT actual antes de insertar
```sql
SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;
-- Guarda este número — debe coincidir con el resultado de 017
```

### Crea el archivo
`supabase/migrations/017_migrate_data.sql` con este contenido exacto:

```sql
-- 017_migrate_data.sql
-- Pobla profile_clinics copiando datos de profiles.clinic_id.
-- Idempotente: ON CONFLICT DO NOTHING — se puede ejecutar varias veces.
-- Rollbackable: truncar profile_clinics o borrar por rango de created_at.
-- Prerequisito: 015 y 016 aplicadas y verificadas.

INSERT INTO profile_clinics (user_id, clinic_id, role)
SELECT
  p.user_id,
  p.clinic_id,
  p.role
FROM profiles p
WHERE p.clinic_id IS NOT NULL
  AND p.role IN ('vet_admin', 'veterinarian', 'pet_owner')
ON CONFLICT (user_id, clinic_id) DO NOTHING;
```

### Ejecuta en Supabase Dashboard → SQL Editor

### Verifica — CRÍTICO
```sql
-- Los dos números deben coincidir
SELECT COUNT(*) FROM profile_clinics;
SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;

-- Distribución por rol (debe ser coherente)
SELECT role, COUNT(*) FROM profile_clinics GROUP BY role ORDER BY role;
```

### Script de rollback para 017
```sql
-- ROLLBACK 017 — borrar todos los datos insertados
-- Solo ejecutar si hay discrepancias o errores en la verificación
TRUNCATE profile_clinics;
-- Verifica: SELECT COUNT(*) FROM profile_clinics; -- debe ser 0
```

### Commit
```bash
git add supabase/migrations/017_migrate_data.sql
git commit -m "feat(B1): migrar profiles.clinic_id → profile_clinics (017)"
git push origin Develop
```

---

## Checklist de cierre de sesión B.1

Antes de dejar esta sesión, confirma que:

- [ ] `015_profile_clinics.sql` ejecutada — tabla existe con 3 políticas
- [ ] `016_rls_rewrite.sql` ejecutada — query de conteo devuelve 0 referencias a `get_user_clinic_id()`
- [ ] `017_migrate_data.sql` ejecutada — COUNT de `profile_clinics` = COUNT de `profiles WHERE clinic_id IS NOT NULL`
- [ ] Los 3 commits están en Develop y pusheados
- [ ] `npx tsc --noEmit` pasa sin errores (las migraciones no tocan src/)
- [ ] Los 3 scripts de rollback están guardados y anotados

---

## Restricciones absolutas

- ❌ No tocar ningún archivo en `src/`
- ❌ No modificar migraciones 001–014 — ya aplicadas en producción
- ❌ No dropear `get_user_clinic_id()` — la sesión B.6 lo hará cuando 0 políticas la referencien
- ❌ No nullificar `profiles.clinic_id` — la sesión B.6 lo hará al final
- ✅ Solo crear `015`, `016` y `017` en `supabase/migrations/`
- ✅ Ejecutar en Supabase y verificar con las queries incluidas
- ✅ `npx tsc --noEmit` debe pasar sin errores

**STOP — no implementar B.2 hasta confirmar que el checklist de B.1 está completo.**
