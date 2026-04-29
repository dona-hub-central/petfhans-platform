# Prompt — Refactor Dashboard Owner: Nuevo Perfil + Widgets

Lee **CLAUDE.md** antes de empezar.

Luego lee en este orden:
```
skills-ai/spec-driven-development/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/incremental-implementation/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
```

Para verificar en browser después de cada paso:
```
skills-ai/browser-testing-with-devtools/SKILL.md
```

Revisa también los recursos de diseño antes de escribir cualquier componente:
```
https://drive.google.com/drive/folders/1zdF6sNBLtZMOxOc8wdAk1_76TFNAlzFN
```

---

## Contexto y estado actual

El usuario `owner` tiene hoy un dashboard en `/owner/dashboard`.
El objetivo es:
1. Liberar `/` para una futura landing page
2. Mover el dashboard actual a `/owner/perfil` como nuevo home del owner
3. Rediseñar esa vista con widgets según el spec de este prompt
4. Hacer la navbar responsiva (hoy solo existe en mobile)

**No hay campo `bpm` en la tabla `pets`.** El widget de BPM debe usar
`weight` y `birth_date` como señales de salud disponibles. Si el equipo
quiere BPM real en el futuro, necesita una migración separada. Por ahora
el widget muestra el peso y la edad calculada, con un indicador visual
de "salud general" basado en si el perfil de la mascota está completo.

---

## Árbol de archivos afectados

```
src/app/owner/
  page.tsx                        ← liberar para landing (PASO 1)
  perfil/
    page.tsx                      ← NUEVO — dashboard principal (PASO 2)
  dashboard/
    page.tsx                      ← redirect → /owner/perfil (PASO 1)

src/components/owner/
  OwnerBottomNav.tsx              ← hacer responsiva (PASO 1)
  dashboard/
    GreetingHeader.tsx            ← NUEVO — widget saludo
    PetSummaryWidget.tsx          ← NUEVO — widget mascota principal
    QuickActionsWidget.tsx        ← NUEVO — widget acciones rápidas
    AiTipsWidget.tsx              ← NUEVO — widget consejos IA
    PetSelectorModal.tsx          ← NUEVO — modal selector de mascota
  
src/app/api/owner/
  dashboard-summary/route.ts      ← NUEVO — un solo fetch para todos los widgets
```

---

## PASO 1 — Reestructuración de rutas y navbar

### 1A — Liberar `/owner/dashboard` y redirigir

Lee `src/app/owner/dashboard/page.tsx` completo.

Reemplaza el contenido por una redirección permanente a `/owner/perfil`:

```typescript
// src/app/owner/dashboard/page.tsx
import { redirect } from 'next/navigation'

export default function DashboardRedirect() {
  redirect('/owner/perfil')
}
```

Lee `src/middleware.ts` y verifica que el login del `owner` redirige a
`/owner/dashboard`. Si es así, cámbialo a `/owner/perfil` directamente:

```typescript
// Buscar el bloque de redirección post-login del owner:
// Antes:  redirect('/owner/dashboard')
// Después: redirect('/owner/perfil')
```

Deja `src/app/owner/page.tsx` vacío (o con un `redirect('/')`) para que
la ruta raíz del owner quede libre para la futura landing.

```bash
npx tsc --noEmit
```
Commit: `refactor: redirect owner login to /owner/perfil, free /owner/dashboard`

---

### 1B — Navbar 100% responsiva

Lee `src/components/owner/OwnerBottomNav.tsx` completo.

La navbar hoy es una barra fija en la parte inferior, solo visible en mobile.
Debe convertirse en un componente adaptativo:

**Mobile (< 768px):** mantiene el comportamiento actual — barra fija en la parte inferior.

**Tablet y Desktop (≥ 768px):** se convierte en una barra lateral izquierda
fija con los mismos items pero con labels visibles junto al icono.

Patrón de implementación:

```tsx
// OwnerBottomNav.tsx — estructura responsiva
<nav className="owner-nav">
  {/* Mobile: bottom bar */}
  <div className="owner-nav__mobile">
    {/* items existentes sin cambios */}
  </div>

  {/* Desktop/Tablet: sidebar */}
  <div className="owner-nav__sidebar">
    {NAV_ITEMS.map(item => (
      <Link key={item.key} href={item.href} className="owner-nav__sidebar-item">
        <item.Icon size={20} />
        <span>{item.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

CSS con variables `--pf-*`:
```css
/* Mobile first */
.owner-nav__sidebar { display: none; }
.owner-nav__mobile  { display: flex; /* estilos actuales */ }

/* Tablet y Desktop */
@media (min-width: 768px) {
  .owner-nav__mobile  { display: none; }
  .owner-nav__sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 220px;
    background: var(--pf-surface);
    border-right: 1px solid var(--pf-border);
    padding: 24px 0;
    gap: 4px;
    z-index: 100;
  }
  .owner-nav__sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    font: var(--pf-text-body);
    color: var(--pf-ink);
    border-radius: var(--pf-r-md);
    margin: 0 8px;
    text-decoration: none;
    transition: background 0.15s;
  }
  .owner-nav__sidebar-item:hover,
  .owner-nav__sidebar-item[data-active="true"] {
    background: var(--pf-primary-tint);
    color: var(--pf-primary);
  }

  /* Empujar el contenido principal para no quedar detrás del sidebar */
  main.owner-main {
    margin-left: 220px;
  }
}
```

Asegúrate de añadir `owner-main` al wrapper de `src/app/owner/layout.tsx`.

```bash
npx tsc --noEmit
```
Commit: `feat: make OwnerBottomNav responsive — sidebar on tablet/desktop`

---

## PASO 2 — Nueva página `/owner/perfil`

Crea `src/app/owner/perfil/page.tsx` como Server Component.
Esta página hace UN solo fetch al endpoint `/api/owner/dashboard-summary`
y pasa los datos a los widgets como props.

```typescript
// src/app/owner/perfil/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GreetingHeader    from '@/components/owner/dashboard/GreetingHeader'
import PetSummaryWidget  from '@/components/owner/dashboard/PetSummaryWidget'
import QuickActionsWidget from '@/components/owner/dashboard/QuickActionsWidget'
import AiTipsWidget      from '@/components/owner/dashboard/AiTipsWidget'

export default async function OwnerPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/owner/dashboard-summary`,
    { headers: { Cookie: `/* pasar cookies de sesión */` }, cache: 'no-store' }
  )
  const summary = await res.json()

  return (
    <main className="owner-main">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <GreetingHeader name={summary.profile.full_name} />
        <PetSummaryWidget
          pets={summary.pets}
          defaultPet={summary.pets[0]}
          appointmentCount={summary.appointmentCount}
        />
        <QuickActionsWidget
          pets={summary.pets}
          unreadMessages={summary.unreadMessages}
        />
        <AiTipsWidget defaultPet={summary.pets[0]} />
      </div>
    </main>
  )
}
```

**Nota sobre el fetch:** en Next.js 16 con App Router, para pasar las cookies
de Supabase a una route interna desde un Server Component, usa el cliente
de servidor directamente en la route en lugar de hacer un fetch HTTP.
Refactoriza si es necesario para evitar ese anti-patrón.

---

## PASO 3 — API route `/api/owner/dashboard-summary`

Lee `skills-ai/api-and-interface-design/SKILL.md`.

Crea `src/app/api/owner/dashboard-summary/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // 1. Perfil
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  // 2. Mascotas — ordenadas por created_at ASC (primera = principal)
  const { data: pets } = await admin
    .from('pets')
    .select('id, name, species, breed, birth_date, weight, photo_url, gender, neutered')
    .eq('owner_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // 3. Citas activas (pending + confirmed)
  const petIds = (pets ?? []).map(p => p.id)
  const { count: appointmentCount } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .in('pet_id', petIds)
    .in('status', ['pending', 'confirmed'])

  // 4. Mensajes no leídos
  // Los mensajes no leídos son los que tienen read_by_recipient = false
  // y el sender NO es el owner (es decir, los enviados por la clínica)
  const { data: conversations } = await admin
    .from('conversations')
    .select('id')
    .eq('owner_id', profile.id)
    .eq('status', 'open')

  const conversationIds = (conversations ?? []).map(c => c.id)
  let unreadMessages = 0
  if (conversationIds.length > 0) {
    const { count } = await admin
      .from('conversation_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('read_by_recipient', false)
      .neq('sender_role', 'pet_owner')  // mensajes recibidos, no enviados
    unreadMessages = count ?? 0
  }

  return NextResponse.json({
    profile,
    pets: pets ?? [],
    appointmentCount: appointmentCount ?? 0,
    unreadMessages,
  })
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add GET /api/owner/dashboard-summary route`

---

## PASO 4 — Componentes de widgets

Lee `skills-ai/frontend-design-quality/SKILL.md` y `frontend-ui-engineering/SKILL.md`.

Todos los widgets usan tarjetas con estas propiedades base:
```css
background: var(--pf-surface);
border-radius: var(--pf-r-lg);
box-shadow: 0 2px 12px rgba(0,0,0,0.06);
padding: 20px;
```

---

### Widget 0 — GreetingHeader

`src/components/owner/dashboard/GreetingHeader.tsx`

```tsx
// Server Component — sin interactividad
export default function GreetingHeader({ name }: { name: string }) {
  const firstName = name?.split(' ')[0] ?? 'tú'
  return (
    <div>
      <p style={{ font: 'var(--pf-text-label)', color: 'var(--pf-muted)', margin: 0 }}>
        Bienvenido de vuelta
      </p>
      <h1 style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-ink)', margin: '4px 0 0' }}>
        Hola, {firstName} 👋
      </h1>
    </div>
  )
}
```

---

### Widget 1 — PetSummaryWidget

`src/components/owner/dashboard/PetSummaryWidget.tsx`

Client Component — maneja el selector de mascota con estado local.

**Datos que muestra:**
- Foto de la mascota (o avatar placeholder con inicial)
- Nombre de la mascota
- Especie + Raza
- Edad calculada desde `birth_date` (en años y meses)
- Peso con unidad `kg`
- Número total de mascotas del usuario
- Número de citas activas (viene de props, no se recalcula)
- Selector de mascota si hay más de una
- Botón "Ver perfil completo" → link a `/owner/pets/{pet.id}`

**Sobre BPM:** la tabla `pets` no tiene campo `bpm`. Muestra en su lugar
un indicador de "Perfil completo" — un porcentaje calculado de cuántos
campos tiene llenos la mascota (breed, birth_date, weight, photo_url, gender).
Si el perfil tiene ≥ 80% de campos completos, muestra `●` en verde.
Si tiene < 80%, muestra `●` en amarillo con el texto "Completa el perfil".

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'

type Pet = {
  id: string; name: string; species: string; breed: string | null
  birth_date: string | null; weight: number | null; photo_url: string | null
  gender: string | null; neutered: boolean | null
}

type Props = {
  pets: Pet[]
  defaultPet: Pet
  appointmentCount: number
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  const totalMonths = years * 12 + months
  if (totalMonths < 12) return `${totalMonths} meses`
  if (totalMonths % 12 === 0) return `${years} año${years > 1 ? 's' : ''}`
  return `${Math.floor(totalMonths / 12)} años, ${totalMonths % 12} meses`
}

function profileCompleteness(pet: Pet): number {
  const fields = [pet.breed, pet.birth_date, pet.weight, pet.photo_url, pet.gender]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

export default function PetSummaryWidget({ pets, defaultPet, appointmentCount }: Props) {
  const [selected, setSelected] = useState<Pet>(defaultPet)
  const completeness = profileCompleteness(selected)

  return (
    <div className="pf-card"> {/* usa la clase de tarjeta del design system */}

      {/* Header del widget */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ font: 'var(--pf-text-label)', color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mi mascota
        </span>
        {pets.length > 1 && (
          <select
            value={selected.id}
            onChange={e => setSelected(pets.find(p => p.id === e.target.value) ?? defaultPet)}
            style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-ink)', border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-r-sm)', padding: '4px 8px' }}
          >
            {pets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Info principal */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ width: 72, height: 72, borderRadius: 'var(--pf-r-lg)', overflow: 'hidden', background: 'var(--pf-primary-tint)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected.photo_url
            ? <img src={selected.photo_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-primary)' }}>{selected.name[0]}</span>
          }
        </div>

        {/* Datos */}
        <div style={{ flex: 1 }}>
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 4px' }}>{selected.name}</p>
          <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: 0 }}>
            {selected.species}{selected.breed ? ` · ${selected.breed}` : ''}
          </p>

          {/* Pills de datos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {[
              { label: 'Edad', value: calcAge(selected.birth_date) },
              { label: 'Peso', value: selected.weight ? `${selected.weight} kg` : '—' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--pf-bg)', borderRadius: 'var(--pf-r-sm)', padding: '4px 10px' }}>
                <span style={{ font: 'var(--pf-text-xs)', color: 'var(--pf-muted)' }}>{item.label} </span>
                <span style={{ font: 'var(--pf-text-sm-bold)', color: 'var(--pf-ink)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicadores numéricos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--pf-border)' }}>
        {[
          { label: 'Mascotas', value: pets.length },
          { label: 'Citas activas', value: appointmentCount },
          { label: 'Perfil', value: `${completeness}%` },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <p style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-primary)', margin: 0 }}>{stat.value}</p>
            <p style={{ font: 'var(--pf-text-xs)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link href={`/owner/pets/${selected.id}`} className="pf-btn pf-btn-primary" style={{ width: '100%', marginTop: 12, textAlign: 'center', display: 'block' }}>
        Ver perfil completo
      </Link>
    </div>
  )
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add PetSummaryWidget with pet selector and stats`

---

### Widget 2 — QuickActionsWidget

`src/components/owner/dashboard/QuickActionsWidget.tsx`

Client Component. Grid de acciones rápidas. Si hay más de una mascota,
las acciones de "Subir documentos", "Recetas IA" y "Subir fotos" abren
primero un modal `PetSelectorModal` antes de navegar.

**Acciones:**

| Key | Label | Icono | Destino |
|-----|-------|-------|---------|
| `messages` | Mensajes | `MessageCircle` | `/owner/messages` + badge de no leídos |
| `marketplace` | Marketplace | `Store` | `/marketplace/clinicas` |
| `docs` | Subir documentos | `FileUp` | `/owner/pets/{id}/docs` |
| `recetas` | Recetas IA | `Sparkles` | `/owner/pets/{id}/recetas` |
| `fotos` | Subir fotos | `Camera` | `/owner/pets/{id}/galeria` |

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Store, FileUp, Sparkles, Camera } from 'lucide-react'
import PetSelectorModal from './PetSelectorModal'

type Pet = { id: string; name: string; photo_url: string | null }

type Props = {
  pets: Pet[]
  unreadMessages: number
}

type ActionKey = 'messages' | 'marketplace' | 'docs' | 'recetas' | 'fotos'

const ACTIONS: { key: ActionKey; label: string; Icon: React.FC<{ size?: number }>; requiresPet: boolean }[] = [
  { key: 'messages',    label: 'Mensajes',          Icon: MessageCircle, requiresPet: false },
  { key: 'marketplace', label: 'Marketplace',        Icon: Store,         requiresPet: false },
  { key: 'docs',        label: 'Documentos',         Icon: FileUp,        requiresPet: true  },
  { key: 'recetas',     label: 'Recetas IA',         Icon: Sparkles,      requiresPet: true  },
  { key: 'fotos',       label: 'Subir fotos',        Icon: Camera,        requiresPet: true  },
]

const ROUTES: Record<ActionKey, (petId?: string) => string> = {
  messages:    ()      => '/owner/messages',
  marketplace: ()      => '/marketplace/clinicas',
  docs:        (id)    => `/owner/pets/${id}/docs`,
  recetas:     (id)    => `/owner/pets/${id}/recetas`,
  fotos:       (id)    => `/owner/pets/${id}/galeria`,
}

export default function QuickActionsWidget({ pets, unreadMessages }: Props) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null)

  function handleAction(key: ActionKey) {
    const action = ACTIONS.find(a => a.key === key)!
    if (action.requiresPet && pets.length > 1) {
      setPendingAction(key)   // abre el modal selector
    } else {
      const petId = pets[0]?.id
      router.push(ROUTES[key](petId))
    }
  }

  return (
    <>
      <div className="pf-card">
        <p style={{ font: 'var(--pf-text-label)', color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Acciones rápidas
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {ACTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleAction(key)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '14px 8px',
                background: 'var(--pf-bg)', border: '1px solid var(--pf-border)',
                borderRadius: 'var(--pf-r-md)', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={22} />
                {key === 'messages' && unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: 'var(--pf-primary)', color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    minWidth: 16, height: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span style={{ font: 'var(--pf-text-xs)', color: 'var(--pf-ink)', textAlign: 'center', lineHeight: 1.2 }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {pendingAction && (
        <PetSelectorModal
          pets={pets}
          actionLabel={ACTIONS.find(a => a.key === pendingAction)!.label}
          onSelect={petId => {
            router.push(ROUTES[pendingAction!](petId))
            setPendingAction(null)
          }}
          onClose={() => setPendingAction(null)}
        />
      )}
    </>
  )
}
```

---

### Widget 2B — PetSelectorModal

`src/components/owner/dashboard/PetSelectorModal.tsx`

```tsx
'use client'

type Pet = { id: string; name: string; photo_url: string | null }

type Props = {
  pets: Pet[]
  actionLabel: string
  onSelect: (petId: string) => void
  onClose: () => void
}

export default function PetSelectorModal({ pets, actionLabel, onSelect, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 200, padding: '0 0 24px',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--pf-surface)', borderRadius: 'var(--pf-r-lg)',
          padding: 24, width: '100%', maxWidth: 420,
        }}
      >
        <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 6px' }}>
          {actionLabel}
        </p>
        <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '0 0 16px' }}>
          ¿Para cuál mascota?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pets.map(pet => (
            <button
              key={pet.id}
              onClick={() => onSelect(pet.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 'var(--pf-r-md)',
                border: '1px solid var(--pf-border)', background: 'var(--pf-bg)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--pf-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {pet.photo_url
                  ? <img src={pet.photo_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ font: 'var(--pf-text-body-bold)', color: 'var(--pf-primary)' }}>{pet.name[0]}</span>
                }
              </div>
              <span style={{ font: 'var(--pf-text-body)', color: 'var(--pf-ink)' }}>{pet.name}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: 12, width: '100%', padding: '10px', font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add QuickActionsWidget + PetSelectorModal`

---

### Widget 3 — AiTipsWidget

`src/components/owner/dashboard/AiTipsWidget.tsx`

Client Component. Carga los consejos de IA para la mascota seleccionada
en el Widget 1. El Widget 1 expone la mascota activa; pásala como prop.

Este widget llama a la ruta existente de IA (la misma que "Recetas")
pero en modo compacto — muestra máximo 3 tips con un link "Ver todos"
que lleva a `/owner/pets/{id}/recetas`.

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

type Pet = { id: string; name: string; species: string; breed: string | null; birth_date: string | null; weight: number | null }

export default function AiTipsWidget({ defaultPet }: { defaultPet: Pet }) {
  const [tips, setTips]       = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/owner/ai-tips?petId=${defaultPet.id}`)
      .then(r => r.json())
      .then(data => {
        setTips(Array.isArray(data.tips) ? data.tips.slice(0, 3) : [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [defaultPet.id])

  return (
    <div className="pf-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--pf-primary)" />
          <span style={{ font: 'var(--pf-text-label)', color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recetas para {defaultPet.name}
          </span>
        </div>
        <Link href={`/owner/pets/${defaultPet.id}/recetas`} style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-primary)' }}>
          Ver todas →
        </Link>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 16, background: 'var(--pf-border)', borderRadius: 4, width: i === 3 ? '60%' : '100%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {error && (
        <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', textAlign: 'center', padding: '8px 0' }}>
          No se pudieron cargar los consejos
        </p>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tips.map((tip, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--pf-primary)', marginTop: 2 }}>✦</span>
              <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-ink)', lineHeight: 1.5 }}>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add AiTipsWidget showing 3 tips for selected pet`

---

## PASO 5 — Ajustar el layout del owner en desktop

Lee `src/app/owner/layout.tsx` completo.

En desktop, el contenido principal necesita `margin-left: 220px` para
no quedar tapado por el sidebar. Añade la clase `owner-main` al `<main>`:

```tsx
// En layout.tsx del owner:
<main className="owner-main">
  {children}
</main>
```

El CSS de `owner-main` ya fue definido en el PASO 1B.

```bash
npx tsc --noEmit
```
Commit: `fix: add owner-main class to layout for desktop sidebar offset`

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

**Prueba manual paso a paso:**

1. Login como `owner` → debe llegar a `/owner/perfil` (no a `/owner/dashboard`)
2. En mobile: la navbar debe ser la barra inferior de siempre
3. En desktop (≥ 768px): debe aparecer el sidebar lateral izquierdo
4. El Widget 1 muestra la primera mascota por defecto con nombre, raza, peso, edad y % de perfil completo
5. Si hay > 1 mascota: el selector del Widget 1 cambia los datos correctamente
6. El badge de Mensajes en Widget 2 muestra los no leídos (o ninguno si todo está leído)
7. Clic en "Subir fotos" con 1 mascota → navega directamente a `/owner/pets/{id}/galeria`
8. Clic en "Subir fotos" con > 1 mascota → abre el modal de selección
9. El Widget 3 carga los 3 primeros tips de IA para la mascota seleccionada
10. El link "Ver todas →" navega a `/owner/pets/{id}/recetas`

PR: `feat: owner profile as new dashboard — widgets + responsive navbar`

---

## Restricciones

- ❌ No toques `src/app/vet/` ni `src/app/admin/`
- ❌ No instales dependencias nuevas (todos los iconos ya están en `lucide-react`)
- ❌ No modifiques migraciones de Supabase
- ❌ No uses `localStorage` ni `sessionStorage`
- ✅ Un commit por paso
- ✅ `npx tsc --noEmit` después de cada componente nuevo
- ✅ Usar variables `--pf-*` para todos los colores, fuentes y radios

---

## Pendientes para fases posteriores

- Sincronizar el selector de mascota entre Widget 1 y Widget 3 usando
  React Context (hoy cada widget maneja su propio estado)
- Añadir campo `bpm` a la tabla `pets` si el equipo decide capturarlo
- Añadir la landing page en `/` cuando esté lista
- Añadir animaciones de entrada a los widgets con `framer-motion`
