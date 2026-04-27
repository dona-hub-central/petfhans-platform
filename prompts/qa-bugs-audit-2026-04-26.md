# Prompt para Claude Code — Reparación de Bugs por Fases
## Basado en audit-2026-04-26.md

**Metodología:** Una fase por sesión de Claude Code. Un commit por bug.
**No avances a la siguiente fase sin que `npx tsc --noEmit` y `npm run build` pasen.**

### Skills a leer antes de empezar cualquier fase
```
skills-ai/coding-best-practices/SKILL.md
skills-ai/debugging-and-error-recovery/SKILL.md
skills-ai/security-and-hardening/SKILL.md
```

---

# FASE 1 — BUGS CRÍTICOS (runtime crash en producción)
## Sesión independiente de Claude Code

**Bugs:** BUG-001, BUG-002, BUG-013  
**Impacto:** Cualquier usuario autenticado sin fila en `profiles` puede provocar un crash no capturado.
**Patrón común:** `profile` se obtiene con `.single()`, se usa optional chaining en los guards (`profile?.role`), pero más adelante se accede con non-null assertion (`profile!.id`) causando `TypeError` en runtime.

---

## BUG-001 — `pets/upload-photo/route.ts`

**Archivo:** `src/app/api/pets/upload-photo/route.ts`

1. Lee el archivo completo
2. Localiza la query que obtiene `profile` (busca `.select('id, role, clinic_id').eq('user_id', user.id)`)
3. Inmediatamente después del cierre de esa query, añade el null guard:

```typescript
if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
```

4. Verifica que las líneas siguientes ya no necesitan optional chaining (`profile?.role` → `profile.role`) — ajusta si es necesario para eliminar redundancia.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-001): add null guard for profile in upload-photo route`

---

## BUG-002 — `appointments/emergency/route.ts`

**Archivo:** `src/app/api/appointments/emergency/route.ts`

1. Lee el archivo completo
2. Localiza el `Promise.all` que obtiene `profile`, `pet` y `vet` en paralelo
3. Después de la desestructuración del `Promise.all`, añade el guard de `profile` ANTES que los de `pet` y `vet`:

```typescript
if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
if (!pet)     return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
if (!vet)     return NextResponse.json({ error: 'Veterinario no encontrado' }, { status: 404 })
```

4. Elimina el `!` de `profile!.id` en la línea 44 — ya no es necesario tras el guard.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-002): add null guard for profile in emergency appointments route`

---

## BUG-013 — `files/upload/route.ts`

**Archivo:** `src/app/api/files/upload/route.ts`

1. Lee el archivo completo
2. Localiza la query que obtiene `profile` (`.select('id, role').eq('user_id', user.id)`)
3. Añade el null guard inmediatamente después:

```typescript
if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
```

4. Elimina el `!` de `profile!.id` en la línea 58.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-013): add null guard for profile in files upload route`

---

## Verificación final de Fase 1

```bash
npx tsc --noEmit
npm run build
git log --oneline -4
```

Los tres bugs comparten el mismo patrón. Si TypeScript no estrecha el tipo automáticamente tras el guard, extrae la variable:
```typescript
const profileId = profile.id  // ahora string, no string | null
```

**La Fase 2 solo arranca si `npm run build` pasa limpio.**

---

# FASE 2 — BUGS ALTOS (lógica rota en producción)
## Sesión independiente de Claude Code

**Bugs:** BUG-003, BUG-004, BUG-006, BUG-015  
**Skills adicionales a leer:**
```
skills-ai/api-and-interface-design/SKILL.md
skills-ai/performance-optimization/SKILL.md
```

---

## BUG-003 — `appointments/route.ts` — ternario muerto

**Archivo:** `src/app/api/appointments/route.ts`  
**Línea aprox:** 122

1. Lee el archivo completo
2. Busca la línea con el patrón: `to: vetEmails.length === 1 ? vetEmails[0] : vetEmails[0]`
3. Reemplaza el bloque completo por:

```typescript
to: vetEmails[0],
cc: vetEmails.length > 1 ? vetEmails.slice(1) : undefined,
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-003): remove dead ternary in vet email recipients`

---

## BUG-004 — `appointments/route.ts` — `.single()` en check de slot

**Archivo:** `src/app/api/appointments/route.ts`  
**Líneas aprox:** 42–50

1. Localiza la query que verifica si un slot está disponible (busca `.in('status', ['pending', 'confirmed'])` seguido de `.single()`)
2. Reemplaza `.single()` por `.limit(1)` y ajusta el condicional:

```typescript
const { data: existing } = await admin.from('appointments')
  .select('id')
  .eq('clinic_id', pet.clinic_id)
  .eq('appointment_date', appointment_date)
  .eq('appointment_time', appointment_time)
  .in('status', ['pending', 'confirmed'])
  .limit(1)

if (existing && existing.length > 0)
  return NextResponse.json({ error: 'Ese horario ya está reservado' }, { status: 409 })
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-004): use .limit(1) instead of .single() for slot availability check`

---

## BUG-006 — `marketplace/clinics/route.ts` — sin límite

**Archivo:** `src/app/api/marketplace/clinics/route.ts`

1. Lee el archivo completo
2. Localiza la query principal de clínicas (`.from('clinics').select(...)`)
3. Añade `.limit(50)` antes del `await`:

```typescript
const { data: clinics, error } = await query.limit(50)
```

4. Si ya existe paginación con `page` y `PAGE_SIZE`, verifica que `.range()` ya implica un límite — en ese caso el bug ya está resuelto y dócumentalo en el commit.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-006): add .limit(50) to marketplace clinics query`

---

## BUG-015 — `marketplace/vets/route.ts` — sin límite

**Archivo:** `src/app/api/marketplace/vets/route.ts`

1. Lee el archivo completo (29 líneas)
2. Añade `.limit(100)` a la query de vets:

```typescript
const { data: vets, error } = await query.limit(100)
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-015): add .limit(100) to marketplace vets query`

---

## Verificación final de Fase 2

```bash
npx tsc --noEmit
npm run build
git log --oneline -5
```

**La Fase 3 solo arranca si el build pasa limpio.**

---

# FASE 3 — BUGS ALTOS (post-migración 019 bloqueantes)
## Sesión independiente de Claude Code

**Bugs:** BUG-007, BUG-014, BUG-016  
**Contexto:** Estos bugs no rompen nada hoy pero bloquearán completamente la funcionalidad cuando se ejecute la migración `019_nullify_profiles_clinic_id.sql`. Son deuda técnica bloqueante con fecha de vencimiento conocida.

**Skills adicionales a leer:**
```
skills-ai/security-invitation-flow/SKILL.md
skills-ai/incremental-implementation/SKILL.md
```

**Patrón del fix:** Reemplazar `profiles.clinic_id` (escalar, pronto NULL) por lectura del header `x-active-clinic-id` inyectado por el middleware, o por consulta a `profile_clinics`.

---

## BUG-007 — `care-requests` routes — `profile.clinic_id` obsoleto

**Archivos:**
- `src/app/api/care-requests/route.ts`
- `src/app/api/care-requests/[id]/route.ts`

1. Lee ambos archivos completos
2. En cada uno, localiza donde se lee `clinic_id` de `profiles`
3. Reemplaza por lectura del header:

```typescript
const activeClinicId = req.headers.get('x-active-clinic-id')
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
```

4. Elimina `clinic_id` del `.select()` de profiles si ya no se usa para nada más

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-007): migrate care-requests routes from profiles.clinic_id to x-active-clinic-id header`

---

## BUG-014 — `owner/setup/route.ts` — escribe campo obsoleto

**Archivo:** `src/app/api/owner/setup/route.ts`

1. Lee el archivo completo
2. Localiza donde se lee `profile.clinic_id` y donde se escribe con `profiles.update({ clinic_id })`
3. Reemplaza la escritura por `profile_clinics`:

```typescript
await admin.from('profile_clinics').upsert(
  { user_id: profile.user_id, clinic_id: clinicId, role: 'pet_owner' },
  { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
)
```

4. Reemplaza la lectura de `profile.clinic_id` por consulta a `profile_clinics` o por el header `x-active-clinic-id`

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-014): migrate owner/setup to write profile_clinics instead of profiles.clinic_id`

---

## BUG-016 — `clinic-join-requests/[id]/route.ts` — bloque de compat obsoleto

**Archivo:** `src/app/api/clinic-join-requests/[id]/route.ts`  
**Líneas:** 64–68

1. Lee el archivo completo
2. Localiza el bloque comentado como `// Phase A compat: also update profiles.clinic_id until migration 019 runs`
3. Elimina ese bloque completo — no la línea de `profile_clinics.upsert`, solo el bloque de `profiles.update`

```typescript
// ELIMINAR este bloque:
await admin
  .from('profiles')
  .update({ clinic_id: joinRequest.clinic_id })
  .eq('id', joinRequest.vet_id)
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-016): remove obsolete Phase A compat block that wrote profiles.clinic_id`

---

## BUG-005 — `care-requests/[id]/route.ts` — `accept` devuelve 501

**Archivo:** `src/app/api/care-requests/[id]/route.ts`

Este bug está marcado como resuelto en la tabla del audit pero el código original tenía el 501. Verifica primero:

```bash
grep -n "501\|Deferred\|profile_clinics" src/app/api/care-requests/\[id\]/route.ts
```

Si aún devuelve 501, implementa `accept`:

1. Localiza el bloque `if (action === 'accept') { return 501 }`
2. Reemplaza por:

```typescript
if (action === 'accept') {
  await admin.from('profile_clinics').upsert(
    {
      user_id: (await admin.from('profiles').select('user_id').eq('id', careRequest.requester_id).single()).data?.user_id,
      clinic_id: careRequest.clinic_id,
      role: 'pet_owner',
    },
    { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
  )
}
```

3. Actualiza el status a `accepted` (ya debe estar más abajo en el mismo handler)

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-005): implement care-request accept action via profile_clinics`

---

## Verificación final de Fase 3

```bash
npx tsc --noEmit
npm run build
git log --oneline -6
```

**La Fase 4 solo arranca si el build pasa limpio.**

---

# FASE 4 — BUGS MEDIOS (comportamiento incorrecto)
## Sesión independiente de Claude Code

**Bugs:** BUG-008, BUG-009, BUG-010, BUG-018  
**Skills adicionales a leer:**
```
skills-ai/security-and-hardening/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
```

---

## BUG-009 — Emails silenciados sin logging

**Archivos:**
- `src/app/api/appointments/route.ts` (líneas 109, 146)
- `src/app/api/appointments/[id]/route.ts` (línea 114)

Primero mapea todos los `.catch(() => {})` relacionados con Resend:

```bash
grep -rn "\.catch.*=>.*{}" src/app/api/ --include="*.ts"
```

Para cada ocurrencia, reemplaza el silencio por logging:

```typescript
// Antes:
await resend.emails.send({ ... }).catch(() => {})

// Después:
await resend.emails.send({ ... }).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[Resend] fallo al enviar email:', msg)
})
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-009): add error logging to silent email catch blocks`

---

## BUG-010 — `vet/ai-chat/route.ts` — registros sin ordenar

**Archivo:** `src/app/api/vet/ai-chat/route.ts`

1. Lee el archivo completo
2. Localiza la query que obtiene registros médicos (`.from('medical_records')` o similar)
3. Añade `.order('visit_date', { ascending: false })` antes del `.limit(10)`:

```typescript
.order('visit_date', { ascending: false })
.limit(10)
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-010): order medical records by visit_date desc in ai-chat context`

---

## BUG-008 — `appointments/slots/route.ts` — enumeración sin ownership

**Archivo:** `src/app/api/appointments/slots/route.ts`

1. Lee el archivo completo
2. Después de verificar que hay usuario autenticado, añade verificación de que el `clinic_id` del query param pertenece al usuario:

```typescript
const clinic_id = searchParams.get('clinic_id')
if (!clinic_id) return NextResponse.json({ error: 'clinic_id requerido' }, { status: 400 })

// Verificar que el usuario tiene relación con esta clínica
const activeClinicId = req.headers.get('x-active-clinic-id')
if (activeClinicId && activeClinicId !== clinic_id) {
  return NextResponse.json({ error: 'Sin acceso a esta clínica' }, { status: 403 })
}
```

**Nota:** Si el endpoint también lo usan pet_owners para buscar slots antes de confirmar, el check debe ser más permisivo — lee el contexto del archivo antes de decidir el nivel de restricción.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-008): add basic ownership check to slots endpoint`

---

## BUG-018 — `appointments/[id]/route.ts` — TypeScript narrowing

**Archivo:** `src/app/api/appointments/[id]/route.ts`  
**Líneas:** 22–43

1. Lee el archivo completo
2. Localiza el guard `if (!callerProfile?.clinic_id)`
3. Extrae la variable para que TypeScript la estreche:

```typescript
const activeClinicId = callerProfile?.clinic_id
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })

// Más adelante, usa activeClinicId en lugar de callerProfile.clinic_id:
if (!appointmentClinicId || appointmentClinicId !== activeClinicId) {
  return NextResponse.json({ error: 'Sin permisos sobre esta cita' }, { status: 403 })
}
```

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-018): extract narrowed activeClinicId variable in appointments/[id] route`

---

## Verificación final de Fase 4

```bash
npx tsc --noEmit
npm run build
git log --oneline -5
```

**La Fase 5 solo arranca si el build pasa limpio.**

---

# FASE 5 — BUGS BAJOS (deuda técnica y calidad)
## Sesión independiente de Claude Code

**Bugs:** BUG-011, BUG-012, BUG-019, BUG-021  
**Skills adicionales a leer:**
```
skills-ai/coding-best-practices/SKILL.md
```

**BUG-020 (emails sin retry) se omite en esta fase** — requiere una decisión de arquitectura (tabla `email_failures` o flag en respuesta) que va más allá de un fix de deuda técnica.

---

## BUG-011 + BUG-021 — URLs de dominio hardcodeadas

**Archivos:**
- `src/app/api/vet/create-invitation/route.ts`
- `src/app/api/vet/resend-invitation/route.ts`
- `src/app/api/appointments/[id]/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/auth/accept-invite/route.ts`

Primero mapea todas las ocurrencias:

```bash
grep -rn "https://petfhans.com\|https://meet.jit.si" src/app/api/ --include="*.ts"
```

Para cada archivo encontrado, reemplaza las URLs hardcodeadas:

```typescript
// Añadir al inicio del handler (o a nivel de módulo si se usa en múltiples funciones):
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'

// Reemplazar:
`https://petfhans.com/auth/login`     →  `${appUrl}/auth/login`
`https://petfhans.com/auth/invite`    →  `${appUrl}/auth/invite`
`https://petfhans.com/owner/dashboard`→  `${appUrl}/owner/dashboard`
`https://petfhans.com/vet/appointments`→ `${appUrl}/vet/appointments`
```

Las URLs de `meet.jit.si` son externas y no deben cambiar.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-011,BUG-021): replace hardcoded petfhans.com URLs with NEXT_PUBLIC_APP_URL`

---

## BUG-012 — `marketplace/clinics/route.ts` — columna sin usar

**Archivo:** `src/app/api/marketplace/clinics/route.ts`

1. Lee el archivo completo
2. Verifica que `public_profile` efectivamente no se usa en la respuesta ni en lógica
3. Si confirmas que no se usa, elimínala del `.select()`:

```typescript
// Antes:
.select('id, name, slug, verified, public_profile')

// Después (si no se usa):
.select('id, name, slug, verified')
```

**Si sí se retorna al cliente**, documenta en el commit que era un falso positivo y no hagas el cambio.

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-012): remove unused public_profile column from clinics select` (o `docs: BUG-012 false positive, public_profile is used`)

---

## BUG-019 — `appointments/route.ts` — non-null assertions

**Archivo:** `src/app/api/appointments/route.ts`  
**Líneas:** 57, 87, 94, 135

1. Lee el archivo completo
2. Verifica que el guard `if (!profile) return 403` existe antes de la línea 57
3. Inmediatamente después del guard, extrae las variables con destrucuring:

```typescript
if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
const { id: profileId, email: profileEmail, full_name: profileName } = profile
```

4. Reemplaza todas las ocurrencias de `profile!.id`, `profile!.email`, `profile!.full_name` por `profileId`, `profileEmail`, `profileName`

```bash
npx tsc --noEmit
```

Commit: `fix(BUG-019): replace non-null assertions with destructured variables in appointments route`

---

## Verificación final de Fase 5 — todas las fases completas

```bash
npx tsc --noEmit
npm run build

# Verificar que no quedan URLs hardcodeadas
grep -rn "https://petfhans.com" src/app/api/ --include="*.ts"
# No debe devolver nada (excepto comentarios)

# Verificar que no quedan .catch(() => {}) sin logging
grep -rn "\.catch.*=>.*{}" src/app/api/ --include="*.ts"
# No debe devolver nada

# Verificar que no quedan profile!.id sin guard previo
grep -rn "profile!\." src/app/api/ --include="*.ts"
# No debe devolver nada

git log --oneline -12
```

Si todo pasa, abre PR de Develop → main:
```bash
gh pr create \
  --base main \
  --head Develop \
  --title "fix: bug fixes from audit 2026-04-26 (BUG-001 to BUG-021)" \
  --body "Fixes: BUG-001, BUG-002, BUG-003, BUG-004, BUG-005, BUG-006, BUG-007, BUG-008, BUG-009, BUG-010, BUG-011, BUG-012, BUG-013, BUG-014, BUG-015, BUG-016, BUG-018, BUG-019, BUG-021\n\nBUG-020 diferido (requiere decisión de arquitectura para retry de emails)"
```

---

## Resumen de fases

| Fase | Bugs | Tipo | Sesión |
|------|------|------|---------|
| 1 | BUG-001, 002, 013 | 🔴 Crítico — null guard + crash | Independiente |
| 2 | BUG-003, 004, 006, 015 | 🟠 Alto — lógica rota | Independiente |
| 3 | BUG-005, 007, 014, 016 | 🟠 Alto — post-migración 019 | Independiente |
| 4 | BUG-008, 009, 010, 018 | 🟡 Medio — comportamiento incorrecto | Independiente |
| 5 | BUG-011, 012, 019, 021 | 🔵 Bajo — deuda técnica | Independiente |

**BUG-020 diferido** — emails sin retry/escalación. Requiere decisión de arquitectura antes de implementar.
