# Fase B.3 — 7 API routes simples: profile.clinic_id → x-active-clinic-id
## Sesión independiente de Claude Code

**Objetivo:** Cambiar 7 API routes para obtener el clinic_id activo del header
`x-active-clinic-id` (inyectado por el middleware en B.2) en lugar de leerlo
del perfil escalar `profiles.clinic_id`. Una route por commit.

**Rama:** Develop  
**Riesgo:** MEDIO — cada cambio es quirúrgico, pero son 7 archivos de producción  
**Prerequisito:** B.1 y B.2 completadas

---

## Antes de empezar

### 1. Lee estos documentos
```
skills-ai/security-invitation-flow/SKILL.md   ← reglas de ownership y clinic_id
skills-ai/api-and-interface-design/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

### 2. Entiende el patrón del cambio

**ANTES (Fase A — escalar):**
```typescript
const { data: profile } = await admin.from('profiles')
  .select('clinic_id, role').eq('user_id', user.id).single()
if (!profile?.clinic_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })
const clinicId = profile.clinic_id
```

**DESPUÉS (Fase B — multi-clínica):**
```typescript
const { data: profile } = await admin.from('profiles')
  .select('role').eq('user_id', user.id).single()
const activeClinicId = request.headers.get('x-active-clinic-id')
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
```

Todas las queries que antes usaban `profile.clinic_id` como scope ahora usan `activeClinicId`.  
El campo `clinic_id` solo se elimina del SELECT si ya no se usa en ninguna otra parte de la route.

### 3. Regla de seguridad invariante
Cada query de `createAdminClient()` que filtre por clínica debe seguir usando
`.eq('clinic_id', activeClinicId)`. El header no valida la pertenencia — solo
transporta el valor. Si el valor no está en `profile_clinics` del usuario, la
operación fallará igualmente por las RLS de las tablas (defence in depth).

---

## Route 1 — `src/app/api/vet/usage/route.ts`

Lee el archivo. Localiza dónde lee `profile.clinic_id`. Sustituye:
- Elimina `clinic_id` del SELECT de profiles
- Lee `activeClinicId = request.headers.get('x-active-clinic-id')`
- Guarda 403 si es null
- Usa `activeClinicId` en todos los `.eq('clinic_id', ...)` que antes usaban `profile.clinic_id`

```bash
npx tsc --noEmit
git add src/app/api/vet/usage/route.ts
git commit -m "feat(B3): vet/usage usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 2 — `src/app/api/vet/create-invitation/route.ts`

Lee el archivo. Identifica los dos usos de `profile.clinic_id`:
1. El que pasa `clinic_id` al crear la invitación
2. El que busca la clínica por `id` para obtener `slug` y `name`

Sustituye ambos por `activeClinicId`.

```bash
npx tsc --noEmit
git add src/app/api/vet/create-invitation/route.ts
git commit -m "feat(B3): create-invitation usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 3 — `src/app/api/vet/resend-invitation/route.ts`

Lee el archivo. Mismo patrón: `profile.clinic_id` → `activeClinicId`.
El `.eq('clinic_id', profile.clinic_id)` en la query de invitaciones pasa a
`.eq('clinic_id', activeClinicId)`.

```bash
npx tsc --noEmit
git add src/app/api/vet/resend-invitation/route.ts
git commit -m "feat(B3): resend-invitation usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 4 — `src/app/api/appointments/route.ts`

Lee el archivo. Localiza:
- La lectura de `profile.clinic_id`
- El check `pet.clinic_id !== profile.clinic_id`

Sustituye por:
```typescript
const activeClinicId = request.headers.get('x-active-clinic-id')
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
// ...
if (!pet || pet.clinic_id !== activeClinicId)
  return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 403 })
```

```bash
npx tsc --noEmit
git add src/app/api/appointments/route.ts
git commit -m "feat(B3): appointments POST usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 5 — `src/app/api/appointments/emergency/route.ts`

Lee el archivo. Mismo patrón que `appointments/route.ts`.

```bash
npx tsc --noEmit
git add src/app/api/appointments/emergency/route.ts
git commit -m "feat(B3): appointments/emergency usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 6 — `src/app/api/files/[id]/route.ts`

Lee el archivo. Localiza la comparación `fileClinidId !== profile.clinic_id`.
Sustituye por:
```typescript
const activeClinicId = request.headers.get('x-active-clinic-id')
// ...
if (!fileRecord || fileClinidId !== activeClinicId)
  return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
```

```bash
npx tsc --noEmit
git add src/app/api/files/[id]/route.ts
git commit -m "feat(B3): files/[id] usa x-active-clinic-id header"
git push origin Develop
```

---

## Route 7 — `src/app/api/files/upload/route.ts`

Lee el archivo. Sustituye `profile.clinic_id` por:
```typescript
const activeClinicId = request.headers.get('x-active-clinic-id')
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
```

```bash
npx tsc --noEmit
git add src/app/api/files/upload/route.ts
git commit -m "feat(B3): files/upload usa x-active-clinic-id header"
git push origin Develop
```

---

## Verificación final de la sesión

```bash
# No debe haber referencias a profile.clinic_id como scope en las 7 routes
grep -n "profile\.clinic_id" \
  src/app/api/vet/usage/route.ts \
  src/app/api/vet/create-invitation/route.ts \
  src/app/api/vet/resend-invitation/route.ts \
  src/app/api/appointments/route.ts \
  src/app/api/appointments/emergency/route.ts \
  src/app/api/files/[id]/route.ts \
  src/app/api/files/upload/route.ts
# Resultado esperado: sin output (0 referencias)

npx tsc --noEmit
```

---

## Checklist de cierre de B.3

- [ ] 7 commits, uno por route, todos en Develop
- [ ] `grep profile.clinic_id` devuelve 0 en las 7 routes
- [ ] `npx tsc --noEmit` pasa
- [ ] Ninguna query de `createAdminClient()` perdió su filtro `.eq('clinic_id', ...)`

---

## Restricciones

- ❌ No tocar `accept-invite`, `owner/setup` ni `ai-chat` — son B.4
- ❌ No tocar `pets/upload-photo` — fue corregida en Fase A y no lee `profile.clinic_id` como scope
- ❌ No refactorizar código que no sea el cambio de scope
- ✅ Un commit por route, en el orden listado
- ✅ `npx tsc --noEmit` después de cada route antes del commit

**STOP — no implementar B.4 hasta confirmar los 7 commits y el grep vacío.**
