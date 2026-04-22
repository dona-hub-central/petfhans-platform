---
name: security-invitation-flow
description: Resuelve las 16 vulnerabilidades de seguridad del flujo de invitaciones de Petfhans. Usar SIEMPRE que se toque cualquiera de estos archivos: accept-invite, create-invitation, validate-invite, appointments, ai-chat, agent/chat, files/upload, files/[id], upload-photo, resend-invitation. Cubre el modelo arquitectural del sobre sellado, la tabla pet_access, la tabla ALLOWED_INVITATION_ROLES y los parches de verificación de los hallazgos C-1 a L-15 del audit report de abril 2026. Si hay alguna duda sobre si un endpoint verifica ownership, clinic_id o role correctamente, leer esta skill.
---

# Security — Invitation Flow

## El Principio: Invitación como Sobre Sellado

Una invitación establece todos sus datos en el momento de creación. El invitado SOLO aporta contraseña y nombre. El servidor ignora completamente `email`, `role` y `clinic_id` del body de `accept-invite`.

```
Invitación (creada por el invitador en el servidor):
├── token          → aleatorio, 64 hex
├── email          → LOCKED: del body del invitador
├── role           → LOCKED: validado contra ALLOWED_INVITATION_ROLES
├── clinic_id      → LOCKED: del perfil del invitador, NUNCA del body
├── pet_ids[]      → LOCKED: mascotas autorizadas (para pet_owner)
├── invited_by     → audit
└── expires_at

POST /api/auth/accept-invite acepta ÚNICAMENTE:
├── token
├── password
└── full_name
```

---

## 1. Tabla de Roles Permitidos (H-7, H-11)

```typescript
// src/lib/invitation-permissions.ts
export const ALLOWED_INVITATION_ROLES: Record<string, string[]> = {
  superadmin:   ['vet_admin'],
  vet_admin:    ['veterinarian', 'pet_owner'],
  veterinarian: ['pet_owner'],
  pet_owner:    [],
}

// Uso en create-invitation — siempre antes de crear la invitación:
const allowed = ALLOWED_INVITATION_ROLES[inviterRole] ?? []
if (!allowed.includes(requestedRole)) {
  return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 })
}
// clinic_id SIEMPRE del perfil del invitador, NUNCA del body
const clinic_id = profile.clinic_id
```

| Invitador | Puede crear | No puede crear |
|-----------|-------------|----------------|
| superadmin | vet_admin | veterinarian, pet_owner |
| vet_admin | veterinarian, pet_owner | superadmin, otro vet_admin |
| veterinarian | pet_owner | cualquier rol de staff |
| pet_owner | (nadie) | cualquier rol |

---

## 2. Tabla pet_access y RLS (M-12, H-9, H-8)

Sustituye la lógica "si eres pet_owner de la clínica ves todas las mascotas" por acceso explícito.

```sql
-- supabase/migrations/XXX_pet_access.sql
CREATE TABLE pet_access (
  owner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id     UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES clinics(id),
  linked_by  UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, pet_id)
);

-- RLS para pets
CREATE POLICY "pet_access_policy" ON pets FOR SELECT
  USING (
    -- Vets y admins ven todas las mascotas de su clínica
    (SELECT role FROM profiles WHERE user_id = auth.uid())
      IN ('superadmin', 'vet_admin', 'veterinarian')
    OR
    -- Pet owners solo ven mascotas autorizadas explícitamente
    auth.uid() IN (
      SELECT pa.owner_id FROM pet_access pa WHERE pa.pet_id = pets.id
    )
  );
```

---

## 3. Fix C-1 — accept-invite (CRÍTICO)

```typescript
// src/app/api/auth/accept-invite/route.ts
export async function POST(req: NextRequest) {
  const { token, password, full_name } = await req.json()
  // ✅ Ignorar cualquier email/role/clinic_id del body

  const { data: inv } = await admin
    .from('invitations')
    .select('email, role, clinic_id, pet_ids, invited_by, used_at, expires_at')
    .eq('token', token)
    .single()

  if (!inv)                                 return error(404, 'Token inválido')
  if (inv.used_at)                          return error(409, 'Invitación ya usada')
  if (new Date(inv.expires_at) < new Date()) return error(410, 'Invitación expirada')

  // Crear usuario con datos DE LA BD, nunca del body
  const { data: { user } } = await admin.auth.admin.createUser({
    email:          inv.email,        // ← de la BD
    password,
    email_confirm:  true,
    user_metadata:  { role: inv.role, clinic_id: inv.clinic_id },
  })

  await admin.from('profiles').insert({
    user_id:   user.id,
    full_name,
    role:      inv.role,         // ← de la BD
    clinic_id: inv.clinic_id,    // ← de la BD
  })

  // Crear accesos en pet_access si es pet_owner
  if (inv.role === 'pet_owner' && inv.pet_ids?.length > 0) {
    await admin.from('pet_access').insert(
      inv.pet_ids.map((pet_id: string) => ({
        owner_id:  user.id,
        pet_id,
        clinic_id: inv.clinic_id,
        linked_by: inv.invited_by,
      }))
    )
  }

  await admin.from('invitations').update({ used_at: new Date() }).eq('token', token)
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

---

## 4. Patrón estándar de API Route — aplicar a TODOS los endpoints

```typescript
export async function METHOD(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // 2. Profile con clinic_id (FUENTE DE VERDAD — nunca del body)
  const { data: profile } = await supabase
    .from('profiles').select('clinic_id, role').eq('user_id', user.id).single()
  if (!profile?.clinic_id)
    return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  // 3. Role check si aplica
  if (!['vet_admin', 'veterinarian'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // 4. TODAS las queries de createAdminClient() incluyen clinic_id
  const admin = createAdminClient()
  const { data } = await admin.from('resource')
    .select('*')
    .eq('clinic_id', profile.clinic_id)  // ← SIEMPRE
    .eq('id', resourceId)
    .single()

  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
}
```

---

## 5. Fixes de Verificación por Hallazgo

### C-2 — Citas cross-clínica
```typescript
// src/app/api/appointments/route.ts
const { data: pet } = await admin.from('pets')
  .select('clinic_id').eq('id', body.pet_id).single()
if (!pet || pet.clinic_id !== profile.clinic_id)
  return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 403 })
```

### C-3 — IA superadmin sin scope
```typescript
// src/app/api/agent/chat/route.ts
// Nunca cargar datos de múltiples clínicas
// El admin especifica explícitamente targetClinicId
// Solo resumen, NUNCA registros médicos individuales de todas las clínicas
const { data: clinicSummary } = await admin
  .from('clinics').select('name, plan').eq('id', targetClinicId).single()
```

### C-4 — IDOR vet AI chat
```typescript
// src/app/api/vet/ai-chat/route.ts
const { data: pet } = await admin.from('pets')
  .select('*, profiles!pets_owner_id_fkey(full_name)')
  .eq('id', body.pet_id)
  .eq('clinic_id', profile.clinic_id)  // ← OBLIGATORIO
  .single()
if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
```

### H-5 — IDOR en archivos
```typescript
// src/app/api/files/[id]/route.ts
const { data: fileRecord } = await admin
  .from('pet_files').select('pet_id, pets!inner(clinic_id)').eq('id', fileId).single()
const fileClinidId = (fileRecord?.pets as any)?.clinic_id
if (!fileRecord || fileClinidId !== profile.clinic_id)
  return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
```

### H-6 — Rate limit en validate-invite
```typescript
// Máx 10 intentos por IP por 15 minutos
// En producción usar Redis; en desarrollo Map en memoria es aceptable
const attempts = new Map<string, { count: number; resetAt: number }>()
// Verificar antes de procesar el token
```

### H-8 — RLS ratings
```sql
-- supabase/migrations/007_fix_ratings_rls.sql
CREATE POLICY "owner_rates_own_appointment" ON appointment_ratings FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT pa.owner_id FROM appointments a
      JOIN pet_access pa ON pa.pet_id = a.pet_id
      WHERE a.id = appointment_ratings.appointment_id
    )
  );
```

### H-9 — Upload sin validación de propietario
```typescript
// src/app/api/files/upload/route.ts y upload-photo/route.ts
if (profile.role === 'pet_owner') {
  const { data: access } = await admin.from('pet_access')
    .select('pet_id').eq('owner_id', user.id)
    .eq('pet_id', body.get('pet_id')).single()
  if (!access)
    return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })
}
```

### H-10 — resend-invitation sin validación
```typescript
// src/app/api/vet/resend-invitation/route.ts
const { data: invitation } = await admin.from('invitations')
  .select('*').eq('id', invitationId)
  .eq('clinic_id', profile.clinic_id)  // ← OBLIGATORIO
  .is('used_at', null).single()
if (!invitation)
  return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
```

### H-11 — RLS invitaciones
```sql
-- supabase/migrations/008_fix_invitations_rls.sql
DROP POLICY IF EXISTS "vet_manages_invitations" ON invitations;
-- vet_admin: gestiona todas las invitaciones de su clínica
CREATE POLICY "vet_admin_manages_invitations" ON invitations FOR ALL
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'vet_admin'
    AND clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
  );
-- veterinarian: solo ve las que él creó con rol pet_owner
CREATE POLICY "vet_sees_own_invitations" ON invitations FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'veterinarian'
    AND invited_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND role = 'pet_owner'
  );
```

---

## 6. Reglas Anti-Alucinación

### SIEMPRE
- Leer `profiles` desde la BD para obtener `clinic_id` y `role` — NUNCA del body
- Añadir `.eq('clinic_id', profile.clinic_id)` en TODOS los queries de `createAdminClient()`
- Verificar `ALLOWED_INVITATION_ROLES[inviterRole]` antes de crear invitaciones
- Para pet_owner: verificar `pet_access` antes de servir, subir o modificar datos de mascotas
- En `accept-invite`: usar `invitation.email`, `invitation.role`, `invitation.clinic_id` de la BD

### NUNCA
- Leer `email`, `role` o `clinic_id` del body en `accept-invite`
- Confiar en el `pet_id` del cliente sin verificar `clinic_id`
- Usar `createAdminClient()` sin scope de `clinic_id`
- Cargar datos de múltiples clínicas en el context de IA
- Asumir que ser `pet_owner` de una clínica implica acceso a todas sus mascotas

---

## 7. Prioridad de Implementación

| Fase | Qué | Cierra | Tiempo |
|------|-----|--------|--------|
| 1 — AHORA | pet_access migration + RLS + ALLOWED_INVITATION_ROLES | Base | 1-2h |
| 2 — AHORA | accept-invite (C-1) + create-invitation (H-7) | C-1, H-7, H-11 | 1h |
| 3 — HOY | appointments (C-2) + vet/ai-chat (C-4) | C-2, C-4 | 1h |
| 4 — HOY | agent/chat (C-3) + files ownership (H-5) | C-3, H-5 | 1-2h |
| 5 — HOY | uploads (H-9) + resend (H-10) + ratings RLS (H-8) | H-8, H-9, H-10 | 1-2h |
| 6 — SEMANA | Rate limiting (H-6) + Storage policies (M-12) | H-6, M-12 | 2h |
| 7 — SEMANA | Migraciones faltantes (M-13) + slots auth (L-15) | M-13, L-15 | 1h |

**Implementar fases 1-2 antes de cualquier otra tarea.** El modelo `pet_access` es la base que hace coherentes todos los demás fixes.
