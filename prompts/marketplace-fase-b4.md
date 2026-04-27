# Fase B.4 — 3 routes complejas: accept-invite (usuario existente), owner/setup, ai-chat
## Sesión independiente de Claude Code

**Objetivo:** Modificar las 3 routes que requieren lógica nueva, no solo sustitución
de variable. La más crítica es `accept-invite`, que debe detectar si el email ya
tiene cuenta y, en ese caso, insertar en `profile_clinics` sin crear un nuevo usuario
en Auth. Lee todas las skills antes de tocar código.

**Rama:** Develop  
**Riesgo:** CRÍTICO para accept-invite — afecta el flujo de registro  
**Prerequisito:** B.1, B.2 y B.3 completadas

---

## Antes de empezar

### 1. Lee estos documentos completos — sin omitir ninguno
```
skills-ai/security-invitation-flow/SKILL.md   ← el más importante de esta sesión
skills-ai/security-and-hardening/SKILL.md
skills-ai/coding-best-practices/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
```

### 2. Lee los 3 archivos que vas a editar
```bash
cat src/app/api/auth/accept-invite/route.ts
cat src/app/api/owner/setup/route.ts
cat src/app/api/vet/ai-chat/route.ts
```

### 3. Verifica B.3 completa
```bash
grep -rn "profile\.clinic_id" src/app/api/vet/usage/route.ts \
  src/app/api/vet/create-invitation/route.ts \
  src/app/api/vet/resend-invitation/route.ts \
  src/app/api/appointments/route.ts \
  src/app/api/appointments/emergency/route.ts \
  src/app/api/files/\[id\]/route.ts \
  src/app/api/files/upload/route.ts
# Resultado esperado: sin output
```

---

## Route 1 — `src/app/api/auth/accept-invite/route.ts` ⚠️ CRÍTICO

### Qué cambia y por qué

El flujo actual **solo soporta usuarios nuevos**: crea un usuario en Auth, luego el
perfil. En Fase B, si una clínica invita a un email que ya tiene cuenta (el dueño
se vincula a una segunda clínica), crear un nuevo usuario Auth duplicaría la cuenta.

El nuevo flujo detecta si el email ya existe y, si es así, solo inserta en
`profile_clinics` (y `pet_access` si aplica) sin tocar Auth.

### Lógica completa del nuevo handler

Lee el archivo actual y reemplaza el `POST` handler con esta lógica (manteniendo
todos los imports existentes):

```typescript
export async function POST(req: NextRequest) {
  try {
    // Principio del sobre sellado: solo token, password y full_name del body
    const { token, full_name, password } = await req.json()
    if (!token || !full_name) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Validar invitación — todos los datos de identidad vienen de la BD
    const { data: inv } = await admin.from('invitations')
      .select('*, clinics(name, slug)')
      .eq('token', token)
      .single()

    if (!inv)                                   return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    if (inv.used_at)                            return NextResponse.json({ error: 'Invitación ya usada' }, { status: 409 })
    if (new Date(inv.expires_at) < new Date())  return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 })

    type InvRow = typeof inv & { clinics?: { name: string; slug: string } | null }
    const invRow = inv as InvRow

    // ── Detectar si el email ya tiene cuenta ─────────────────────────────
    const { data: existingProfile } = await admin.from('profiles')
      .select('id, user_id').eq('email', inv.email).single()

    if (existingProfile) {
      // ── PATH: usuario existente — solo vincula a la nueva clínica ──────
      // password se ignora (el usuario ya tiene contraseña)

      // Insertar en profile_clinics
      await admin.from('profile_clinics').upsert({
        user_id:   existingProfile.user_id,
        clinic_id: inv.clinic_id,
        role:      inv.role,
      }, { onConflict: 'user_id,clinic_id' })

      // Si es pet_owner con mascotas asignadas, crear pet_access
      if (inv.role === 'pet_owner' && Array.isArray(inv.pet_ids) && inv.pet_ids.length > 0) {
        await admin.from('pet_access').insert(
          inv.pet_ids.map((pet_id: string) => ({
            owner_id:  existingProfile.id,
            pet_id,
            clinic_id: inv.clinic_id,
            linked_by: inv.created_by ?? existingProfile.id,
          }))
        )
      }

      // Si es pet_owner con mascota singular (invitaciones legacy)
      if (inv.pet_id && inv.role === 'pet_owner') {
        await admin.from('pet_access').upsert({
          owner_id:  existingProfile.id,
          pet_id:    inv.pet_id,
          clinic_id: inv.clinic_id,
          linked_by: inv.created_by ?? existingProfile.id,
        }, { onConflict: 'owner_id,pet_id' })
      }

      // Marcar invitación usada
      await admin.from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', inv.id)

      await sendWelcomeEmail({
        to:         inv.email,
        name:       full_name,
        clinicName: invRow.clinics?.name ?? 'Petfhans',
        loginUrl:   'https://petfhans.com/auth/login',
      })

      return NextResponse.json({ success: true, existing: true })

    } else {
      // ── PATH: usuario nuevo — flujo original + insertar en profile_clinics ──

      if (!password) {
        return NextResponse.json({ error: 'Contraseña requerida para cuenta nueva' }, { status: 400 })
      }

      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email:         inv.email,
        password,
        email_confirm: true,
        user_metadata: { role: inv.role, full_name, clinic_id: inv.clinic_id },
      })

      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

      const { data: newProfile } = await admin.from('profiles').upsert({
        user_id:   authData.user.id,
        role:      inv.role,
        full_name,
        email:     inv.email,
        clinic_id: inv.clinic_id,
      }, { onConflict: 'user_id' }).select('id').single()

      // Insertar también en profile_clinics (fuente de verdad multi-clínica)
      await admin.from('profile_clinics').upsert({
        user_id:   authData.user.id,
        clinic_id: inv.clinic_id,
        role:      inv.role,
      }, { onConflict: 'user_id,clinic_id' })

      // Mascota singular legacy
      if (inv.pet_id && newProfile?.id) {
        await admin.from('pets').update({ owner_id: newProfile.id }).eq('id', inv.pet_id)
        if (inv.role === 'pet_owner') {
          await admin.from('pet_access').upsert({
            owner_id:  newProfile.id,
            pet_id:    inv.pet_id,
            clinic_id: inv.clinic_id,
            linked_by: inv.created_by ?? newProfile.id,
          }, { onConflict: 'owner_id,pet_id' })
        }
      }

      // Mascotas múltiples (pet_ids)
      if (inv.role === 'pet_owner' && Array.isArray(inv.pet_ids) && inv.pet_ids.length > 0 && newProfile?.id) {
        await admin.from('pet_access').insert(
          inv.pet_ids.map((pet_id: string) => ({
            owner_id:  newProfile.id,
            pet_id,
            clinic_id: inv.clinic_id,
            linked_by: inv.created_by,
          }))
        )
      }

      await admin.from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', inv.id)

      await sendWelcomeEmail({
        to:         inv.email,
        name:       full_name,
        clinicName: invRow.clinics?.name ?? 'Petfhans',
        loginUrl:   'https://petfhans.com/auth/login',
      })

      return NextResponse.json({ success: true, existing: false })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
```

### Verificación de seguridad antes del commit

Confirma que en el nuevo handler:
- [ ] `email`, `role`, `clinic_id` NUNCA se leen del body — siempre de `inv`
- [ ] El path de usuario existente no llama `auth.admin.createUser`
- [ ] El path de usuario nuevo inserta en AMBOS `profiles` Y `profile_clinics`
- [ ] `password` es requerido en el path de usuario nuevo, ignorado en el existente
- [ ] Ambos paths marcan la invitación como usada

```bash
npx tsc --noEmit
git add src/app/api/auth/accept-invite/route.ts
git commit -m "feat(B4): accept-invite soporta usuario existente via profile_clinics"
git push origin Develop
```

---

## Route 2 — `src/app/api/owner/setup/route.ts`

### Qué cambia

Actualmente: si el owner no tiene clínica asignada, busca por slug y escribe
`profiles.update({ clinic_id })`. En Fase B, debe también insertar en
`profile_clinics`.

### Cambio exacto

Lee el archivo. Localiza el bloque:
```typescript
await admin.from('profiles').update({ clinic_id: clinicId }).eq('id', profile.id)
```

Añade inmediatamente después:
```typescript
await admin.from('profile_clinics').upsert({
  user_id:   user.id,
  clinic_id: clinicId,
  role:      'pet_owner',
}, { onConflict: 'user_id,clinic_id' })
```

No elimines el `profiles.update` — `profiles.clinic_id` sigue siendo la fuente
de verdad hasta B.6.

```bash
npx tsc --noEmit
git add src/app/api/owner/setup/route.ts
git commit -m "feat(B4): owner/setup también escribe en profile_clinics"
git push origin Develop
```

---

## Route 3 — `src/app/api/vet/ai-chat/route.ts`

### Qué cambia

El guard de seguridad actual lee `profile.clinic_id` del perfil con el cliente
user-scoped. En Fase B, si `profiles.clinic_id` es null (vet multi-clínica), el
guard falla aunque el vet tenga una clínica activa via cookie.

### Cambio exacto

Lee el archivo. Localiza este bloque (líneas ~15–17):
```typescript
const { data: profile } = await supabase.from('profiles')
  .select('clinic_id').eq('user_id', user.id).single()
if (!profile?.clinic_id) return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })
```

Reemplázalo con:
```typescript
const activeClinicId = req.headers.get('x-active-clinic-id')
if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
```

Luego, en la query que usa `profile.clinic_id` como scope (la del `.eq('clinic_id', profile.clinic_id)`,
línea ~36):
```typescript
// ANTES:
.eq('clinic_id', profile.clinic_id)
// DESPUÉS:
.eq('clinic_id', activeClinicId)
```

El `import { createClient }` puede eliminarse si ya no se usa en ningún otro lugar
del archivo (verificar). Si se usa para auth, mantenlo — el auth check de `user`
sigue siendo necesario.

```bash
npx tsc --noEmit
git add src/app/api/vet/ai-chat/route.ts
git commit -m "feat(B4): ai-chat usa x-active-clinic-id header para scope de clínica"
git push origin Develop
```

---

## Verificación final de la sesión

```bash
# Las 3 routes no deben usar profile.clinic_id como scope
grep -n "profile\.clinic_id\|profile?\.clinic_id" \
  src/app/api/auth/accept-invite/route.ts \
  src/app/api/owner/setup/route.ts \
  src/app/api/vet/ai-chat/route.ts

# Verificar que accept-invite no lee email/role/clinic_id del body
grep -n "body\.\|req\.json\|formData" src/app/api/auth/accept-invite/route.ts

npx tsc --noEmit
```

---

## Checklist de cierre de B.4

- [ ] 3 commits en Develop, pusheados
- [ ] `accept-invite`: path existente no crea usuario en Auth, solo inserta en `profile_clinics`
- [ ] `accept-invite`: path nuevo inserta en `profiles` Y en `profile_clinics`
- [ ] `owner/setup`: escribe en `profiles` Y en `profile_clinics`
- [ ] `ai-chat`: scope via `x-active-clinic-id`, nunca via `profile.clinic_id`
- [ ] `npx tsc --noEmit` pasa
- [ ] Ningún campo `email`/`role`/`clinic_id` se lee del body en `accept-invite`

---

## Restricciones

- ❌ No tocar los 7 archivos de B.3 — ya están migrados
- ❌ No leer `email`, `role` ni `clinic_id` del body en `accept-invite`
- ❌ No eliminar `profiles.clinic_id` del UPDATE en `owner/setup` — B.6 lo nullifica
- ✅ Un commit por route
- ✅ `npx tsc --noEmit` después de cada route

**STOP — no implementar B.5 hasta confirmar los 3 commits y el checklist.**
