# Fase C.4 — El Handshake del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Implementar los flujos de conexión entre usuarios y clínicas.
**Rama:** Develop
**Prerequisito:** Fase C.3 completada — páginas del marketplace cargan sin errores.

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md
skills-ai/security-invitation-flow/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

Verifica el prerequisito:
```bash
find src/app/marketplace -name "page.tsx" | wc -l
# Debe mostrar al menos 3
```

---

## Los tres flujos

```
FLUJO A — Dueño solicita atención
  dueño → POST /api/care-requests
        → care_requests.status = 'pending'
        → vet_admin ve la solicitud en su panel
  vet_admin → PATCH /api/care-requests/[id]
            → 'accept' | 'reject' | 'block'
            → Nota: vincular a profile_clinics es Fase D

FLUJO B — Clínica invita directamente
  Ya existe via create-invitation. Sin cambios en C.4.

FLUJO C — Vet solicita unirse a segunda clínica
  vet → POST /api/clinic-join-requests
      → clinic_join_requests.status = 'pending'
  vet_admin → PATCH /api/clinic-join-requests/[id]
            → 'accept' | 'reject'
            → Nota: vincular el vet es Fase D
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
    .select('id').eq('clinic_id', result.data.clinic_id).eq('profile_id', profile.id).maybeSingle()
  if (block) return NextResponse.json({ error: 'No puedes solicitar atención en esta clínica' }, { status: 403 })

  // Rate limit: no puede reintentar hasta 1h después del último rechazo
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentRejection } = await admin
    .from('care_requests')
    .select('id')
    .eq('clinic_id', result.data.clinic_id)
    .eq('requester_id', profile.id)
    .eq('status', 'rejected')
    .gt('responded_at', oneHourAgo)
    .maybeSingle()

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

  if (error || !request) {
    console.error('[care-requests POST]', error)
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: request.id }, { status: 201 })
}
```

Verifica: `npx tsc --noEmit`
Commit: `feat(C4a): POST /api/care-requests`

---

## Ruta 2 — `PATCH /api/care-requests/[id]`

**Archivo:** `src/app/api/care-requests/[id]/route.ts`

Acciones: `accept` (cambia status — vincular es Fase D), `reject` (con motivo), `block` (insert en clinic_blocks).

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

  // Solo vet_admin puede responder solicitudes
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

  if (action === 'block') {
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
    status:        newStatus,
    response_note: response_note ?? null,
    responded_by:  profile.id,
    responded_at:  new Date().toISOString(),
  }).eq('id', id)

  // NOTA: si action === 'accept', la vinculación a profile_clinics
  // se implementa en Fase D cuando profile_clinics esté activo.

  return NextResponse.json({ ok: true, status: newStatus })
}
```

Verifica: `npx tsc --noEmit`
Commit: `feat(C4b): PATCH /api/care-requests/[id]`

---

## Ruta 3 — `POST /api/clinic-join-requests`

**Archivo:** `src/app/api/clinic-join-requests/route.ts`

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
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya tienes una solicitud pendiente en esta clínica' }, { status: 409 })
    }
    console.error('[clinic-join-requests POST]', error)
    return NextResponse.json({ error: 'Error al crear la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

Verifica: `npx tsc --noEmit`
Commit: `feat(C4c): POST /api/clinic-join-requests`

---

## Componente `CareRequestForm`

**Archivo:** `src/components/marketplace/CareRequestForm.tsx`

Formulario modal para el botón "Solicitar atención" en `/marketplace/clinicas/[slug]`.
Es un Client Component — usa `'use client'`.

```typescript
'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

type Pet = { id: string; name: string; species: string }

type CareRequestFormProps = {
  clinicId: string
  clinicName: string
  userPets: Pet[]
  onClose: () => void
  onSuccess: () => void
}

export default function CareRequestForm({
  clinicId, clinicName, userPets, onClose, onSuccess
}: CareRequestFormProps) {
  const [petMode, setPetMode] = useState<'existing' | 'new'>(
    userPets.length > 0 ? 'existing' : 'new'
  )
  const [selectedPet, setSelectedPet] = useState(userPets[0]?.id ?? '')
  const [newPetName, setNewPetName] = useState('')
  const [newPetSpecies, setNewPetSpecies] = useState('dog')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, string> = { clinic_id: clinicId }
      if (petMode === 'existing' && selectedPet) {
        body.pet_id = selectedPet
      } else {
        if (!newPetName.trim()) { setError('Escribe el nombre de la mascota'); setLoading(false); return }
        body.pet_name    = newPetName.trim()
        body.pet_species = newPetSpecies
      }
      if (reason.trim()) body.reason = reason.trim()

      const res = await fetch('/api/care-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar la solicitud')
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--pf-white)',
        borderRadius: 'var(--pf-r-lg)',
        padding: 28,
        width: '100%', maxWidth: 480,
        position: 'relative',
      }}>
        <button
          aria-label="Cerrar"
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--pf-muted)',
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-ink)', margin: '0 0 4px' }}>
          Solicitar atención
        </h2>
        <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '0 0 20px' }}>
          {clinicName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mascota */}
          {userPets.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <button
                onClick={() => setPetMode('existing')}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--pf-r-sm)',
                  border: `1.5px solid ${petMode === 'existing' ? 'var(--pf-coral)' : 'var(--pf-border)'}`,
                  background: petMode === 'existing' ? 'var(--pf-coral-soft)' : 'transparent',
                  color: petMode === 'existing' ? 'var(--pf-coral)' : 'var(--pf-muted)',
                  cursor: 'pointer', font: 'var(--pf-text-sm)', fontWeight: 600,
                }}
              >Mascota existente</button>
              <button
                onClick={() => setPetMode('new')}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--pf-r-sm)',
                  border: `1.5px solid ${petMode === 'new' ? 'var(--pf-coral)' : 'var(--pf-border)'}`,
                  background: petMode === 'new' ? 'var(--pf-coral-soft)' : 'transparent',
                  color: petMode === 'new' ? 'var(--pf-coral)' : 'var(--pf-muted)',
                  cursor: 'pointer', font: 'var(--pf-text-sm)', fontWeight: 600,
                }}
              >Mascota nueva</button>
            </div>
          )}

          {petMode === 'existing' && userPets.length > 0 ? (
            <div>
              <label style={{ display: 'block', font: 'var(--pf-text-sm)', fontWeight: 500, color: 'var(--pf-ink)', marginBottom: 6 }}>
                Mascota
              </label>
              <select
                className="pf-input"
                value={selectedPet}
                onChange={e => setSelectedPet(e.target.value)}
              >
                {userPets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', font: 'var(--pf-text-sm)', fontWeight: 500, color: 'var(--pf-ink)', marginBottom: 6 }}>
                  Nombre de la mascota
                </label>
                <input
                  className="pf-input"
                  value={newPetName}
                  onChange={e => setNewPetName(e.target.value)}
                  placeholder="Ej: Luna"
                />
              </div>
              <div>
                <label style={{ display: 'block', font: 'var(--pf-text-sm)', fontWeight: 500, color: 'var(--pf-ink)', marginBottom: 6 }}>
                  Especie
                </label>
                <select className="pf-input" value={newPetSpecies} onChange={e => setNewPetSpecies(e.target.value)}>
                  <option value="dog">Perro</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="rabbit">Conejo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', font: 'var(--pf-text-sm)', fontWeight: 500, color: 'var(--pf-ink)', marginBottom: 6 }}>
              Motivo de consulta <span style={{ color: 'var(--pf-muted)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              className="pf-input"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Describe brevemente el motivo de la consulta…"
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && (
            <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-danger-fg)', margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="pf-btn pf-btn-primary"
          >
            {loading ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

Verifica: `npx tsc --noEmit`
Commit: `feat(C4d): CareRequestForm component`

---

## Conectar CareRequestForm a la página de clínica

Actualiza `src/app/marketplace/clinicas/[slug]/page.tsx`:

1. Convierte la página a Client Component (`'use client'`) o crea un componente wrapper Client para el botón
2. Importa `CareRequestForm` y `useState`
3. Reemplaza el `<button>` estático de "Solicitar atención" por uno que abra el modal:

```typescript
// Añadir en el componente:
const [showForm, setShowForm] = useState(false)
const [requested, setRequested] = useState(false)

// Reemplazar el botón:
{!isBlocked && (
  <>
    {requested ? (
      <div style={{
        padding: '10px 16px',
        background: 'var(--pf-success)',
        color: 'var(--pf-success-fg)',
        borderRadius: 'var(--pf-r-sm)',
        font: 'var(--pf-text-body)',
        fontWeight: 500,
      }}>
        ✓ Solicitud enviada — la clínica te contactará pronto
      </div>
    ) : (
      <button
        onClick={() => setShowForm(true)}
        className="pf-btn pf-btn-primary"
      >
        Solicitar atención
      </button>
    )}
    {showForm && (
      <CareRequestForm
        clinicId={clinic.id}
        clinicName={clinic.name}
        userPets={userPets}  // pasar mascotas del usuario autenticado
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); setRequested(true) }}
      />
    )}
  </>
)}
```

Nota: para pasar `userPets` necesitas fetcharlas server-side y pasarlas como prop, o hacer un fetch client-side al montar el componente.

Verifica: `npx tsc --noEmit`
Commit: `feat(C4e): connect CareRequestForm to clinic profile page`

---

## Sección de solicitudes en el panel del vet_admin

**Archivo nuevo:** `src/app/vet/requests/page.tsx`

Página simple que lista las `care_requests` pendientes de la clínica:

- Solo accesible para `vet_admin`
- Lista las solicitudes con `status = 'pending'`
- Botones: Aceptar / Rechazar (con campo de motivo) / Bloquear
- Al hacer clic llama a `PATCH /api/care-requests/[id]`

Usa el patrón de Client Component con fetch — los botones necesitan acción del usuario.

Verifica: `npx tsc --noEmit`
Commit: `feat(C4f): vet requests panel — pending care_requests`

---

## Verificación final de Fase C.4

```bash
npx tsc --noEmit
npm run build
```

Prueba el flujo completo con la app corriendo:

```bash
# 1. Como pet_owner: crear solicitud
curl -s -X POST http://localhost:3000/api/care-requests \
  -H "Content-Type: application/json" \
  -H "Cookie: [sesión pet_owner]" \
  -d '{"clinic_id": "[uuid-clinica-verificada]", "pet_name": "Luna", "pet_species": "cat"}'
# → 201 { ok: true, id: "..." }

# 2. Como pet_owner: reintentar inmediatamente después de rechazo → debe dar 429
# 3. Como vet_admin: PATCH con { action: 'reject', response_note: 'Sin disponibilidad' } → 200
# 4. Como vet_admin: PATCH con { action: 'block' } → 200 + fila en clinic_blocks
# 5. Como vet: POST /api/clinic-join-requests → 201
```

Commit final:
```bash
git add src/app/api/care-requests/ \
        src/app/api/clinic-join-requests/ \
        src/components/marketplace/ \
        src/app/vet/requests/
git commit -m "feat(C4): marketplace handshake — care-requests, join-requests, UI forms"
git push origin Develop
```

---

## Lo que queda para Fase D

Cuando `profile_clinics` esté activo (Fase B completa):

- `PATCH /api/care-requests/[id]` con `action: 'accept'`
  → `profile_clinics.insert({ user_id, clinic_id, role: 'pet_owner' })`
- `PATCH /api/clinic-join-requests/[id]` con `action: 'accept'`
  → `profile_clinics.insert({ user_id, clinic_id, role: vet_role })`

Hoy ambas rutas cambian el `status` pero no vinculan. En Fase D solo hay que añadir el insert en esos dos puntos exactos.

---

## Restricciones

- ❌ No implementar la vinculación a `profile_clinics` — es Fase D
- ❌ No modificar rutas existentes
- ❌ No instalar dependencias nuevas
- ✅ Zod validation en todas las rutas POST y PATCH
- ✅ Rate limiting en `POST /api/care-requests` (1h entre rechazos)
- ✅ `npx tsc --noEmit` después de cada archivo
- ✅ Un commit por sub-tarea (C4a, C4b, C4c, C4d, C4e, C4f)
