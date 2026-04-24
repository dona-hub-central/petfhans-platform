# Fase C.4 — El Handshake del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Implementar los tres flujos de conexión entre usuarios y clínicas.
**Prerequisito:** Fase C.3 completada (UI del marketplace funcional)

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md   ← spec del handshake (sección "El handshake")
skills-ai/security-invitation-flow/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

---

## Los tres flujos

### Flujo A — Dueño solicita atención
```
dueño → POST /api/care-requests
       { clinic_id, pet_id?, pet_name?, pet_species?, reason?, preferred_vet? }
       ↓
       care_requests.status = 'pending'
       ↓
       email al vet_admin de la clínica

vet_admin → PATCH /api/care-requests/[id]
            { action: 'accept' | 'reject' | 'block', response_note? }
            ↓
            'accept' → status = 'accepted'
                       [Nota: vincular a profile_clinics es Fase D]
            'reject' → status = 'rejected'
            'block'  → status = 'blocked'
                       INSERT clinic_blocks
```

### Flujo B — Clínica invita directamente
Ya existe via `create-invitation`. No hay cambios en C.4.

### Flujo C — Vet solicita unirse a segunda clínica
```
vet → POST /api/clinic-join-requests
      { clinic_id, message? }
      ↓
      clinic_join_requests.status = 'pending'

vet_admin → PATCH /api/clinic-join-requests/[id]
            { action: 'accept' | 'reject' }
            [Nota: vincular el vet es Fase D]
```

---

## Ruta 1 — `POST /api/care-requests`

**Archivo:** `src/app/api/care-requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  clinic_id:     z.string().uuid(),
  pet_id:        z.string().uuid().optional(),
  pet_name:      z.string().min(1).max(100).optional(),
  pet_species:   z.string().max(50).optional(),
  reason:        z.string().max(500).optional(),
  preferred_vet: z.string().uuid().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()

  // Obtener el profile del solicitante
  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // Solo pet_owner puede solicitar atención
  if (profile.role !== 'pet_owner') {
    return NextResponse.json({ error: 'Solo los dueños pueden solicitar atención' }, { status: 403 })
  }

  // Verificar que la clínica existe y está verificada
  const { data: clinic } = await admin
    .from('clinics').select('id, name').eq('id', result.data.clinic_id).eq('verified', true).single()
  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  // Verificar que no está bloqueado
  const { data: block } = await admin
    .from('clinic_blocks')
    .select('id').eq('clinic_id', result.data.clinic_id).eq('profile_id', profile.id).single()
  if (block) return NextResponse.json({ error: 'No puedes solicitar atención en esta clínica' }, { status: 403 })

  // Verificar rate limit: no puede reintentar hasta 1h después del último rechazo
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentRejection } = await admin
    .from('care_requests')
    .select('id, responded_at')
    .eq('clinic_id', result.data.clinic_id)
    .eq('requester_id', profile.id)
    .eq('status', 'rejected')
    .gt('responded_at', oneHourAgo)
    .single()

  if (recentRejection) {
    return NextResponse.json(
      { error: 'Debes esperar 1 hora antes de volver a solicitar atención en esta clínica' },
      { status: 429 }
    )
  }

  const { data: request, error } = await admin
    .from('care_requests')
    .insert({
      requester_id:  profile.id,
      clinic_id:     result.data.clinic_id,
      pet_id:        result.data.pet_id ?? null,
      pet_name:      result.data.pet_name ?? null,
      pet_species:   result.data.pet_species ?? null,
      reason:        result.data.reason ?? null,
      preferred_vet: result.data.preferred_vet ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[care-requests POST]', error)
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: request.id }, { status: 201 })
}
```

---

## Ruta 2 — `PATCH /api/care-requests/[id]`

**Archivo:** `src/app/api/care-requests/[id]/route.ts`

Acciones: `accept` (solo cambia status — vincular es Fase D), `reject` (con motivo), `block` (insert en clinic_blocks + status = blocked).

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  action:        z.enum(['accept', 'reject', 'block']),
  response_note: z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
  }

  const admin = createAdminClient()

  // Solo vet_admin puede responder
  const { data: profile } = await supabase
    .from('profiles').select('id, role, clinic_id').eq('user_id', user.id).single()

  if (profile?.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Verificar que la solicitud pertenece a su clínica
  const { data: careRequest } = await admin
    .from('care_requests')
    .select('id, requester_id, clinic_id, status')
    .eq('id', id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  if (!careRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (careRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Esta solicitud ya fue respondida' }, { status: 409 })
  }

  const { action, response_note } = result.data
  const now = new Date().toISOString()

  if (action === 'block') {
    // Insertar en clinic_blocks + actualizar status
    await admin.from('clinic_blocks').upsert({
      clinic_id:  careRequest.clinic_id,
      profile_id: careRequest.requester_id,
      blocked_by: profile.id,
      reason:     response_note ?? null,
    }, { onConflict: 'clinic_id,profile_id' })
  }

  const newStatus = action === 'accept' ? 'accepted'
                  : action === 'reject' ? 'rejected'
                  : 'blocked'

  await admin.from('care_requests').update({
    status:       newStatus,
    response_note: response_note ?? null,
    responded_by: profile.id,
    responded_at: now,
  }).eq('id', id)

  // Nota: si action === 'accept', la vinculación a profile_clinics
  // se implementa en Fase D cuando profile_clinics esté activo.

  return NextResponse.json({ ok: true, status: newStatus })
}
```

---

## Ruta 3 — `POST /api/clinic-join-requests`

**Archivo:** `src/app/api/clinic-join-requests/route.ts`

Permite a un vet solicitar unirse a una segunda clínica.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  clinic_id: z.string().uuid(),
  message:   z.string().max(500).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()

  if (!['veterinarian', 'vet_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Solo veterinarios pueden solicitar unirse a una clínica' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: clinic } = await admin
    .from('clinics').select('id').eq('id', result.data.clinic_id).single()
  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  const { error } = await admin.from('clinic_join_requests').insert({
    vet_id:    profile!.id,
    clinic_id: result.data.clinic_id,
    message:   result.data.message ?? null,
  })

  if (error) {
    if (error.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Ya tienes una solicitud pendiente en esta clínica' }, { status: 409 })
    }
    console.error('[clinic-join-requests POST]', error)
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

---

## Componentes UI del handshake

### `CareRequestForm`
Formulario modal que aparece al hacer clic en "Solicitar atención".
Campos: mascota (selector de mascotas existentes + opción "mascota nueva"), motivo (opcional), preferencia de vet (opcional).
Al enviar: `POST /api/care-requests` → toast de confirmación.

### `ClinicJoinRequestForm`
Formulario modal para vets en `/marketplace/clinicas/[slug]`.
Campo: mensaje de presentación (opcional).
Al enviar: `POST /api/clinic-join-requests` → toast de confirmación.

### Panel del vet_admin — solicitudes entrantes
Sección nueva en `/vet/dashboard` o `/vet/requests`:
- Lista de `care_requests` con `status = 'pending'` de su clínica
- Botones: Aceptar / Rechazar (con campo de motivo) / Bloquear

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

Prueba el flujo completo:
1. Como pet_owner: `POST /api/care-requests` → 201
2. Como vet_admin: `PATCH /api/care-requests/[id]` con `{ action: 'reject' }` → 200
3. Como pet_owner: segundo `POST` inmediato → 429 (rate limit 1h)
4. Como vet_admin: `PATCH` con `{ action: 'block' }` → 200, fila en `clinic_blocks`

Commit:
```bash
git add src/app/api/care-requests/ \
        src/app/api/clinic-join-requests/ \
        src/components/marketplace/
git commit -m "feat(C4): marketplace handshake — care-requests, join-requests, UI forms"
git push origin Develop
```

---

## Lo que queda pendiente para Fase D

Cuando `profile_clinics` esté activo (Fase B completa):
- `PATCH /api/care-requests/[id]` con `action: 'accept'` → `profile_clinics.insert()`
- `PATCH /api/clinic-join-requests/[id]` con `action: 'accept'` → `profile_clinics.insert()`

Hoy ambas rutas cambian el `status` pero no vinculan al usuario. Cuando llegue Fase D, solo hay que añadir el insert en esos dos puntos.

---

## Restricciones

- ❌ No implementar la vinculación en `profile_clinics` — es Fase D
- ❌ No modificar rutas existentes
- ❌ No instalar dependencias nuevas
- ✅ Zod validation en todas las rutas POST y PATCH
- ✅ Rate limiting en `POST /api/care-requests`
- ✅ `npx tsc --noEmit` después de cada archivo
