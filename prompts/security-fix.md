# Prompt para Claude Code — Security Fix: Flujo de Invitaciones

## Instrucciones de trabajo

Eres un ingeniero de seguridad senior. Tu única tarea en esta sesión es aplicar los fixes de seguridad descritos en este prompt. **Lee cada archivo antes de modificarlo.** No inventes estructuras ni imports — verifica que existen. Después de cada tarea ejecuta `npx tsc --noEmit` y confirma que compila antes de continuar.

**Skill obligatoria:** Lee `skills-ai/security-invitation-flow/SKILL.md` completa antes de empezar cualquier tarea. Es la fuente de verdad para todos los fixes.

**Rama:** Develop

**Regla de oro:** El `clinic_id`, `email` y `role` NUNCA vienen del body de la request en rutas de auth. Siempre del perfil autenticado en la BD.

---

## TAREA 0 — Crear la base (pre-requisito de todo lo demás)

### 0.A — Crear `src/lib/invitation-permissions.ts`

Este archivo no existe. Créalo:

```typescript
/**
 * Tabla de roles que cada tipo de usuario puede crear al invitar.
 * El servidor lee esta tabla antes de crear cualquier invitación.
 * El campo `role` del body de la request NUNCA se usa directamente.
 */
export const ALLOWED_INVITATION_ROLES: Record<string, string[]> = {
  superadmin:   ['vet_admin'],
  vet_admin:    ['veterinarian', 'pet_owner'],
  veterinarian: ['pet_owner'],
  pet_owner:    [],
}

/**
 * Verifica si un invitador puede crear una invitación con el rol solicitado.
 * @param inviterRole - Rol del usuario que crea la invitación (de la BD)
 * @param requestedRole - Rol que se quiere asignar al invitado (del body)
 * @returns true si está permitido
 */
export function canInviteRole(inviterRole: string, requestedRole: string): boolean {
  return (ALLOWED_INVITATION_ROLES[inviterRole] ?? []).includes(requestedRole)
}
```

### 0.B — Crear migración `supabase/migrations/008_pet_access.sql`

La última migración existente es `007_appointments_vet.sql`. Crea la siguiente:

```sql
-- 008_pet_access.sql
-- Tabla de acceso explícito: quién puede ver qué mascotas
-- Reemplaza la lógica implícita "pet_owner de la clínica ve todas las mascotas"

CREATE TABLE IF NOT EXISTS pet_access (
  owner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id     UUID NOT NULL REFERENCES pets(id)     ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES clinics(id),
  linked_by  UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, pet_id)
);

ALTER TABLE pet_access ENABLE ROW LEVEL SECURITY;

-- vet_admin y veterinarian gestionan los accesos de su clínica
CREATE POLICY "vet_manages_pet_access" ON pet_access
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid())
      IN ('vet_admin', 'veterinarian')
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );

-- pet_owner solo ve sus propios accesos
CREATE POLICY "owner_sees_own_access" ON pet_access
  FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Actualizar RLS de pets: pet_owner solo ve mascotas en pet_access
DROP POLICY IF EXISTS "pet_owner_reads_pets" ON pets;

CREATE POLICY "pets_access_policy" ON pets
  FOR SELECT
  USING (
    -- Vets y admins ven todas las mascotas de su clínica
    (
      (SELECT role FROM profiles WHERE user_id = auth.uid())
        IN ('superadmin', 'vet_admin', 'veterinarian')
      AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    -- Pet owners solo ven mascotas autorizadas explícitamente
    (
      (SELECT id FROM profiles WHERE user_id = auth.uid()) IN (
        SELECT pa.owner_id FROM pet_access pa WHERE pa.pet_id = pets.id
      )
    )
  );
```

### 0.C — Crear migración `supabase/migrations/009_fix_invitations_rls.sql`

```sql
-- 009_fix_invitations_rls.sql
-- Separa permisos de vet_admin y veterinarian sobre invitaciones (cierra H-11)
-- Añade columna pet_ids a invitations si no existe (requerida por accept-invite)

-- Añadir pet_ids a invitations para registrar mascotas autorizadas al pet_owner
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS pet_ids UUID[] NOT NULL DEFAULT '{}';

-- Eliminar política existente demasiado permisiva
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
    AND invited_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND role = 'pet_owner'
  );
```

### 0.D — Crear migración `supabase/migrations/010_fix_ratings_rls.sql`

```sql
-- 010_fix_ratings_rls.sql
-- Corrige RLS de appointment_ratings (cierra H-8)
-- La política anterior usaba WITH CHECK (rated_by = 'owner') sin verificar
-- que el usuario es el propietario real de la cita

DROP POLICY IF EXISTS "rating_insert" ON appointment_ratings;
DROP POLICY IF EXISTS "owner_can_rate" ON appointment_ratings;

CREATE POLICY "owner_rates_own_appointment" ON appointment_ratings
  FOR INSERT
  WITH CHECK (
    -- El usuario autenticado es el dueño de la mascota de la cita
    (SELECT id FROM profiles WHERE user_id = auth.uid()) IN (
      SELECT pa.owner_id
      FROM appointments a
      JOIN pet_access pa ON pa.pet_id = a.pet_id
      WHERE a.id = appointment_ratings.appointment_id
    )
  );
```

**Verificación de TAREA 0:**
```bash
npx tsc --noEmit
# Debe compilar sin errores
# Los archivos SQL se revisan manualmente — verifica la sintaxis antes de guardar
```

**Commit:** `security: add pet_access model, permission table and RLS migrations`

---

## TAREA 1 — Fix C-1: accept-invite (CRÍTICO)

**Archivo:** `src/app/api/auth/accept-invite/route.ts`

1. Lee el archivo completo
2. Identifica dónde se lee `email`, `role` o `clinic_id` del body
3. Reemplaza la lógica completa del handler siguiendo el patrón de la skill:

**Lo que DEBE hacer el handler:**
- Extraer del body Únicamente: `token`, `password`, `full_name`
- Buscar la invitación en la BD por `token`
- Verificar: existe, no fue usada, no expirada
- Crear el usuario con `invitation.email`, `invitation.role`, `invitation.clinic_id` — **nunca del body**
- Crear el perfil con los mismos datos de la invitación
- Si `invitation.role === 'pet_owner'` e `invitation.pet_ids.length > 0`: insertar filas en `pet_access`
- Marcar `invitation.used_at = NOW()`

**Lo que NUNCA debe hacer:**
- Leer `email` del body
- Leer `role` del body
- Leer `clinic_id` del body

Referencia completa del código en `skills-ai/security-invitation-flow/SKILL.md` sección 3.

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(C-1): accept-invite ignores email/role/clinic_id from body`

---

## TAREA 2 — Fix H-7: create-invitation (ALTO)

**Archivo:** `src/app/api/vet/create-invitation/route.ts`

1. Lee el archivo completo
2. Localiza dónde se lee `role` del body y cómo se asigna `clinic_id`
3. Añade la validación al inicio del handler, después de obtener el perfil:

```typescript
import { canInviteRole } from '@/lib/invitation-permissions'

// Después de obtener profile:
const requestedRole = body.role  // del body
if (!canInviteRole(profile.role, requestedRole)) {
  return NextResponse.json(
    { error: `El rol '${profile.role}' no puede crear invitaciones con rol '${requestedRole}'` },
    { status: 403 }
  )
}

// clinic_id SIEMPRE del perfil del servidor
const clinic_id = profile.clinic_id  // nunca del body
```

4. Verifica que `clinic_id` en el INSERT de invitación usa `profile.clinic_id`, no `body.clinic_id`
5. Añade `pet_ids` al INSERT si el rol es `pet_owner` (viene del body como array de UUIDs validados)

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(H-7,H-11): validate invitation role against permission table`

---

## TAREA 3 — Fix C-2: appointments cross-clínica (CRÍTICO)

**Archivo:** `src/app/api/appointments/route.ts`

1. Lee el archivo completo
2. Localiza la lógica de creación de cita (POST handler)
3. Después de obtener el perfil del usuario, añade verificación de ownership:

```typescript
// Verificar que el pet pertenece a la clínica del usuario
const { data: pet, error: petError } = await admin
  .from('pets')
  .select('clinic_id')
  .eq('id', body.pet_id)
  .single()

if (petError || !pet || pet.clinic_id !== profile.clinic_id) {
  return NextResponse.json(
    { error: 'Mascota no encontrada' },
    { status: 403 }  // 403, no 404 — no revelar si existe en otra clínica
  )
}
```

4. Verifica que el archivo `src/app/api/appointments/slots/route.ts` existe y añade verificación de auth si no la tiene (L-15)

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(C-2,L-15): appointments ownership check and slots auth`

---

## TAREA 4 — Fix C-4: IDOR en vet/ai-chat (CRÍTICO)

**Archivo:** `src/app/api/vet/ai-chat/route.ts`

1. Lee el archivo completo
2. Localiza el query que obtiene el pet por `pet_id`
3. Añade `.eq('clinic_id', profile.clinic_id)` al query:

```typescript
// Cambiar esto:
// .eq('id', pet_id)
// Por esto:
const { data: pet } = await admin
  .from('pets')
  .select('*, profiles!pets_owner_id_fkey(full_name)')
  .eq('id', pet_id)
  .eq('clinic_id', profile.clinic_id)  // ← OBLIGATORIO
  .single()

if (!pet) {
  return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
}
```

4. Verifica que `profile.clinic_id` está disponible en este punto (debe haberse obtenido antes)

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(C-4): vet ai-chat scoped to clinic_id`

---

## TAREA 5 — Fix C-3: agent/chat vuelca toda la BD (CRÍTICO)

**Archivo:** `src/app/api/agent/chat/route.ts`

1. Lee el archivo completo
2. Identifica todas las queries que cargan datos sin filtro de `clinic_id`
3. Para cada una:
   - Si carga todos los pets: añade `.eq('clinic_id', targetClinicId)`
   - Si carga todos los registros médicos: añade `.eq('clinic_id', targetClinicId)` o elimina del context
   - Si carga todas las clínicas: limitar a la clínica seleccionada o solo metadatos (nombre, plan)

4. El superadmin debe seleccionar explícitamente la clínica a consultar (`body.clinic_id`). Verificar que ese `clinic_id` existe:

```typescript
const targetClinicId = body.clinic_id
if (!targetClinicId) {
  return NextResponse.json({ error: 'Selecciona una clínica' }, { status: 400 })
}

// Verificar que la clínica existe
const { data: clinic } = await admin
  .from('clinics').select('name, plan').eq('id', targetClinicId).single()
if (!clinic) {
  return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
}

// Solo pasar al context de IA: resumen de la clínica + conteos
// NUNCA: registros médicos individuales, datos de pacientes de otras clínicas
```

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(C-3): agent/chat scoped to selected clinic`

---

## TAREA 6 — Fix H-5: IDOR en archivos (ALTO)

**Archivo:** `src/app/api/files/[id]/route.ts`

1. Lee el archivo completo
2. Identifica el GET y DELETE handler
3. En ambos, después de obtener el perfil, verifica que el archivo pertenece a la clínica:

```typescript
// Obtener el archivo con join a pets para verificar clinic_id
const { data: fileRecord } = await admin
  .from('pet_files')
  .select('id, file_path, pet_id, pets!inner(clinic_id)')
  .eq('id', fileId)
  .single()

const fileClinidId = (fileRecord?.pets as { clinic_id: string } | null)?.clinic_id

if (!fileRecord || fileClinidId !== profile.clinic_id) {
  return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
}

// Si es pet_owner, verificar además que tiene acceso a esa mascota
if (profile.role === 'pet_owner') {
  const { data: access } = await admin
    .from('pet_access')
    .select('pet_id')
    .eq('owner_id', (await admin.from('profiles').select('id').eq('user_id', user.id).single()).data?.id)
    .eq('pet_id', fileRecord.pet_id)
    .single()
  if (!access) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }
}
```

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(H-5): files ownership check via clinic_id and pet_access`

---

## TAREA 7 — Fix H-9: uploads sin validación (ALTO)

**Archivos:**
- `src/app/api/files/upload/route.ts`
- `src/app/api/pets/upload-photo/route.ts`

En ambos archivos, si el usuario es `pet_owner`, verificar que tiene acceso a la mascota antes de aceptar el upload:

```typescript
if (profile.role === 'pet_owner') {
  const petId = formData.get('pet_id') as string
  if (!petId) {
    return NextResponse.json({ error: 'pet_id requerido' }, { status: 400 })
  }

  // Obtener el id del profile (no user.id)
  const { data: profileRecord } = await admin
    .from('profiles').select('id').eq('user_id', user.id).single()

  const { data: access } = await admin
    .from('pet_access')
    .select('pet_id')
    .eq('owner_id', profileRecord?.id)
    .eq('pet_id', petId)
    .single()

  if (!access) {
    return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })
  }
}
```

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(H-9): file uploads verify pet_access for pet_owners`

---

## TAREA 8 — Fix H-10: resend-invitation sin validación (ALTO)

**Archivo:** `src/app/api/vet/resend-invitation/route.ts`

1. Lee el archivo completo
2. Localiza el query que obtiene la invitación por ID
3. Añade `.eq('clinic_id', profile.clinic_id)` al query:

```typescript
// Cambiar esto:
// .eq('id', invitationId)
// Por esto:
const { data: invitation } = await admin
  .from('invitations')
  .select('*')
  .eq('id', invitationId)
  .eq('clinic_id', profile.clinic_id)  // ← OBLIGATORIO
  .is('used_at', null)
  .single()

if (!invitation) {
  return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
}
```

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(H-10): resend-invitation validates clinic ownership`

---

## TAREA 9 — Fix H-6: rate limit en validate-invite (ALTO)

**Archivo:** `src/app/api/auth/validate-invite/route.ts`

1. Lee el archivo completo
2. Añade rate limiting al inicio del handler:

```typescript
// Rate limiting: máx 10 intentos por IP en 15 minutos
// En producción migrar a Redis; en desarrollo Map en memoria es aceptable
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) return false
    entry.count++
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  }
  return true
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta en 15 minutos.' },
      { status: 429 }
    )
  }
  // ... resto del handler sin cambios
}
```

**Nota:** La constante `rateLimitMap` debe declararse fuera del handler para persistir entre requests en el mismo proceso.

**Verificación:**
```bash
npx tsc --noEmit
```

**Commit:** `fix(H-6): rate limiting on validate-invite endpoint`

---

## Commit final consolidado

Después de verificar que todas las tareas compilan y los tests pasan:

```bash
# Verificación final
npx tsc --noEmit
npm run build

# Si todo pasa:
git add \
  src/lib/invitation-permissions.ts \
  supabase/migrations/008_pet_access.sql \
  supabase/migrations/009_fix_invitations_rls.sql \
  supabase/migrations/010_fix_ratings_rls.sql \
  src/app/api/auth/accept-invite/route.ts \
  src/app/api/auth/validate-invite/route.ts \
  src/app/api/vet/create-invitation/route.ts \
  src/app/api/vet/resend-invitation/route.ts \
  src/app/api/appointments/route.ts \
  src/app/api/appointments/slots/route.ts \
  src/app/api/vet/ai-chat/route.ts \
  src/app/api/agent/chat/route.ts \
  src/app/api/files/upload/route.ts \
  src/app/api/files/[id]/route.ts \
  src/app/api/pets/upload-photo/route.ts

git commit -m "security: fix C-1 C-2 C-3 C-4 H-5 H-6 H-7 H-8 H-9 H-10 H-11 L-15 (audit abril 2026)"
git push origin Develop
```

---

## Restricciones absolutas

- ❌ No leer `email`, `role` ni `clinic_id` del body en rutas de auth
- ❌ No usar `createAdminClient()` sin `.eq('clinic_id', profile.clinic_id)` en los queries
- ❌ No modificar el schema de Supabase fuera de los archivos de migración
- ❌ No modificar `src/app/api/monitoring/` (health check, no afectado)
- ❌ No instalar dependencias nuevas
- ❌ No tocar archivos de UI (`src/app/vet/`, `src/components/`) en esta sesión
- ✅ `npx tsc --noEmit` debe pasar después de cada tarea antes de continuar
- ✅ Un commit por tarea — no acumular todo al final
