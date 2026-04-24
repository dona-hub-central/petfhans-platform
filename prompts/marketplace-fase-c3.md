# Fase C.3 — UI del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las páginas y componentes visuales del marketplace.
**Rama:** Develop
**Prerequisito:** Fase C.2 completada — rutas GET devuelven 200.

---

## Antes de empezar

Lee estos archivos en orden:
```
prompts/marketplace-multiclínica.md
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/coding-best-practices/SKILL.md
skills-ai/spec-driven-development/SKILL.md
src/app/globals.css
src/app/vet/dashboard/page.tsx
```

Verifica el prerequisito:
```bash
find src/app/api/marketplace -name "route.ts" | wc -l
# Debe mostrar 3
```

---

## Estructura de archivos a crear

```
src/app/marketplace/
  layout.tsx                     ← layout del marketplace (auth check + navbar)
  page.tsx                       ← redirect a /marketplace/clinicas
  clinicas/
    page.tsx                     ← listado + búsqueda de clínicas
  clinicas/[slug]/
    page.tsx                     ← perfil público de clínica
  veterinarios/
    page.tsx                     ← listado + búsqueda de vets

src/components/marketplace/
  MarketplaceClinicCard.tsx      ← card de clínica
  MarketplaceVetCard.tsx         ← card de vet
  MarketplaceSearch.tsx          ← barra de búsqueda reutilizable
```

---

## Tokens de diseño — usar siempre

```
Colores:   var(--pf-coral), var(--pf-ink), var(--pf-muted), var(--pf-surface), var(--pf-white)
Bordes:    var(--pf-border)  0.5px
Radios:    var(--pf-r-md) cards estándar, var(--pf-r-lg) cards grandes
Fuentes:   var(--pf-text-h2), var(--pf-text-h3), var(--pf-text-body), var(--pf-text-sm)
Badge ✓:   fondo var(--pf-coral-soft), texto var(--pf-coral)
Iconos:    lucide-react — nunca emoji
```

---

## Paso 1 — Layout del marketplace

**Archivo:** `src/app/marketplace/layout.tsx`

- Server Component
- Verifica sesión activa — si no hay usuario redirect a `/auth/login`
- Muestra un header simple con el logo de Petfhans y un link a `/vet/dashboard` (o al dashboard del rol activo)
- No usa VetLayout — es un layout propio más limpio

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pf-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--pf-white)',
        borderBottom: '0.5px solid var(--pf-border)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/marketplace/clinicas" style={{
          font: 'var(--pf-text-h3)',
          color: 'var(--pf-coral)',
          textDecoration: 'none',
        }}>
          🐾 Petfhans
        </Link>
        <Link href="/vet/dashboard" style={{
          font: 'var(--pf-text-sm)',
          color: 'var(--pf-muted)',
          textDecoration: 'none',
        }}>
          Mi panel →
        </Link>
      </header>

      {/* Contenido */}
      <main style={{ maxWidth: 1024, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 2 — Componente `MarketplaceClinicCard`

**Archivo:** `src/components/marketplace/MarketplaceClinicCard.tsx`

```typescript
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'

type MarketplaceClinicCardProps = {
  id: string
  name: string
  slug: string
  city: string | null
  verified: boolean
  rating_avg: number | null
  rating_count: number
  public_profile: {
    description?: string
    specialties?: string[]
  } | null
}

export default function MarketplaceClinicCard({
  name, slug, city, verified, rating_avg, rating_count, public_profile,
}: MarketplaceClinicCardProps) {
  const specialties = public_profile?.specialties?.slice(0, 3) ?? []

  return (
    <Link href={`/marketplace/clinicas/${slug}`} style={{
      display: 'block',
      background: 'var(--pf-white)',
      border: '0.5px solid var(--pf-border)',
      borderRadius: 'var(--pf-r-md)',
      padding: '20px',
      textDecoration: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-coral-mid)'
      ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--pf-shadow-card-hover)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-border)'
      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
    }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0 }}>{name}</p>
        {verified && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            background: 'var(--pf-coral-soft)',
            color: 'var(--pf-coral)',
            borderRadius: 'var(--pf-r-pill)',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}>✓ Verificada</span>
        )}
      </div>

      {/* Ciudad */}
      {city && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <MapPin size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
          <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)' }}>{city}</span>
        </div>
      )}

      {/* Rating */}
      {rating_count > 0 && rating_avg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Star size={12} strokeWidth={2} style={{ color: 'var(--pf-coral)', fill: 'var(--pf-coral)' }} />
          <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-ink)', fontWeight: 500 }}>
            {rating_avg.toFixed(1)}
          </span>
          <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)' }}>
            ({rating_count} {rating_count === 1 ? 'valoración' : 'valoraciones'})
          </span>
        </div>
      )}

      {/* Especialidades */}
      {specialties.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {specialties.map(s => (
            <span key={s} style={{
              font: 'var(--pf-text-sm)',
              background: 'var(--pf-surface)',
              color: 'var(--pf-muted)',
              borderRadius: 'var(--pf-r-xs)',
              padding: '2px 8px',
            }}>{s}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 3 — Componente `MarketplaceVetCard`

**Archivo:** `src/components/marketplace/MarketplaceVetCard.tsx`

```typescript
import { User } from 'lucide-react'

type Clinic = { id: string; name: string; slug: string }

type MarketplaceVetCardProps = {
  id: string
  full_name: string
  role: string
  clinics: Clinic[]
}

export default function MarketplaceVetCard({ full_name, role, clinics }: MarketplaceVetCardProps) {
  const roleLabel = role === 'vet_admin' ? 'Veterinario responsable' : 'Veterinario'

  return (
    <div style={{
      background: 'var(--pf-white)',
      border: '0.5px solid var(--pf-border)',
      borderRadius: 'var(--pf-r-md)',
      padding: '20px',
    }}>
      {/* Avatar + nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          background: 'var(--pf-coral-soft)',
          color: 'var(--pf-coral)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <User size={20} strokeWidth={1.75} />
        </div>
        <div>
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0 }}>{full_name}</p>
          <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>{roleLabel}</p>
        </div>
      </div>

      {/* Clínicas */}
      {clinics.length > 0 && (
        <div style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)' }}>
          Atiende en: {clinics.map(c => c.name).join(', ')}
        </div>
      )}
    </div>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 4 — Página `/marketplace/clinicas`

**Archivo:** `src/app/marketplace/clinicas/page.tsx`

- Server Component que carga el listado inicial
- Soporta búsqueda via searchParams `?q=...`
- Grid de MarketplaceClinicCard
- Empty state si no hay resultados

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceClinicCard from '@/components/marketplace/MarketplaceClinicCard'
import { Search } from 'lucide-react'

export const metadata = { title: 'Clínicas · Petfhans Marketplace' }

export default async function MarketplaceClinicasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()

  const params = await searchParams
  const q    = params.q?.trim() ?? ''
  const page = Math.max(0, parseInt(params.page ?? '0', 10))
  const PAGE_SIZE = 20

  const admin = createAdminClient()

  // Clínicas bloqueadas para este usuario
  const { data: blocked } = await admin
    .from('clinic_blocks').select('clinic_id').eq('profile_id', profile?.id ?? '')
  const blockedIds = (blocked ?? []).map((b: { clinic_id: string }) => b.clinic_id)

  let query = admin
    .from('clinics')
    .select('id, name, slug, city, verified, public_profile, rating_avg, rating_count')
    .eq('verified', true)
    .not('public_profile', 'is', null)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order('rating_avg', { ascending: false })

  if (blockedIds.length > 0) {
    query = query.not('id', 'in', `(${blockedIds.join(',')})`)
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
  }

  const { data: clinics } = await query

  return (
    <>
      <style>{`
        .clinic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .clinic-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ font: 'var(--pf-text-h1)', color: 'var(--pf-ink)', margin: '0 0 4px' }}>
          Clínicas veterinarias
        </h1>
        <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: 0 }}>
          Encuentra la clínica ideal para tu mascota
        </p>
      </header>

      {/* Búsqueda */}
      <form method="GET" style={{ position: 'relative', maxWidth: 480 }}>
        <Search size={16} strokeWidth={2} style={{
          position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--pf-muted)', pointerEvents: 'none',
        }} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o ciudad…"
          className="pf-input"
          style={{ paddingLeft: 36 }}
        />
      </form>

      {/* Grid de clínicas */}
      {(clinics?.length ?? 0) > 0 ? (
        <div className="clinic-grid">
          {(clinics ?? []).map((clinic: {
            id: string; name: string; slug: string; city: string | null;
            verified: boolean; rating_avg: number | null; rating_count: number;
            public_profile: { description?: string; specialties?: string[] } | null
          }) => (
            <MarketplaceClinicCard key={clinic.id} {...clinic} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 6px' }}>
            No encontramos clínicas
          </p>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: 0 }}>
            {q ? `Sin resultados para "${q}"` : 'No hay clínicas verificadas disponibles aún.'}
          </p>
        </div>
      )}
    </>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 5 — Página `/marketplace/clinicas/[slug]`

**Archivo:** `src/app/marketplace/clinicas/[slug]/page.tsx`

- Perfil público de una clínica verificada
- Muestra equipo, descripción, especialidades, rating
- Si el usuario está bloqueado: banner y CTA deshabilitado
- Si no está bloqueado: botón "Solicitar atención" (no funcional aún — se activa en C.4)

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { MapPin, Star, Users } from 'lucide-react'

export default async function ClinicaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { slug } = await params
  const admin = createAdminClient()

  const { data: clinic } = await admin
    .from('clinics')
    .select('id, name, slug, city, verified, public_profile, rating_avg, rating_count')
    .eq('slug', slug)
    .eq('verified', true)
    .single()

  if (!clinic) notFound()

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()

  const { data: block } = await admin
    .from('clinic_blocks')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('profile_id', profile?.id ?? '')
    .maybeSingle()

  const isBlocked = !!block

  const { data: team } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('clinic_id', clinic.id)
    .in('role', ['veterinarian', 'vet_admin'])

  const pp = clinic.public_profile as {
    description?: string; specialties?: string[]
  } | null

  return (
    <>
      {/* Bloqueo banner */}
      {isBlocked && (
        <div style={{
          background: 'var(--pf-surface)',
          border: '0.5px solid var(--pf-border)',
          borderRadius: 'var(--pf-r-md)',
          padding: '14px 20px',
          marginBottom: 20,
          font: 'var(--pf-text-body)',
          color: 'var(--pf-muted)',
        }}>
          Esta clínica no está disponible para ti.
        </div>
      )}

      {/* Header de la clínica */}
      <div style={{
        background: 'var(--pf-white)',
        border: '0.5px solid var(--pf-border)',
        borderRadius: 'var(--pf-r-lg)',
        padding: '28px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h1 style={{ font: 'var(--pf-text-h1)', color: 'var(--pf-ink)', margin: 0 }}>{clinic.name}</h1>
          {clinic.verified && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
              borderRadius: 'var(--pf-r-pill)', padding: '3px 10px',
            }}>✓ Verificada</span>
          )}
        </div>

        {clinic.city && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <MapPin size={14} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
            <span style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)' }}>{clinic.city}</span>
          </div>
        )}

        {(clinic.rating_count ?? 0) > 0 && clinic.rating_avg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            <Star size={14} strokeWidth={2} style={{ color: 'var(--pf-coral)', fill: 'var(--pf-coral)' }} />
            <span style={{ font: 'var(--pf-text-body)', fontWeight: 500, color: 'var(--pf-ink)' }}>
              {clinic.rating_avg.toFixed(1)}
            </span>
            <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)' }}>
              ({clinic.rating_count} valoraciones)
            </span>
          </div>
        )}

        {pp?.description && (
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-ink)', margin: '0 0 16px' }}>
            {pp.description}
          </p>
        )}

        {(pp?.specialties?.length ?? 0) > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {(pp?.specialties ?? []).map(s => (
              <span key={s} style={{
                font: 'var(--pf-text-sm)',
                background: 'var(--pf-surface)', color: 'var(--pf-muted)',
                borderRadius: 'var(--pf-r-xs)', padding: '3px 10px',
              }}>{s}</span>
            ))}
          </div>
        )}

        {/* CTA — funcional en C.4 */}
        <button
          disabled={isBlocked}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--pf-r-sm)',
            background: isBlocked ? 'var(--pf-surface)' : 'var(--pf-coral)',
            color: isBlocked ? 'var(--pf-muted)' : '#fff',
            border: 'none',
            font: 'var(--pf-text-body)',
            fontWeight: 600,
            cursor: isBlocked ? 'not-allowed' : 'pointer',
          }}
        >
          {isBlocked ? 'Esta clínica no está disponible para ti' : 'Solicitar atención'}
        </button>
      </div>

      {/* Equipo */}
      {(team?.length ?? 0) > 0 && (
        <div style={{
          background: 'var(--pf-white)',
          border: '0.5px solid var(--pf-border)',
          borderRadius: 'var(--pf-r-md)',
          overflow: 'hidden',
        }}>
          <header style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--pf-border)' }}>
            <h2 style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-ink)', margin: 0 }}>
              Equipo
            </h2>
          </header>
          {(team ?? []).map((vet: { id: string; full_name: string; role: string }) => (
            <div key={vet.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 20px',
              borderTop: '0.5px solid var(--pf-border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Users size={16} strokeWidth={2} />
              </div>
              <div>
                <p style={{ font: 'var(--pf-text-body)', fontWeight: 500, color: 'var(--pf-ink)', margin: 0 }}>
                  {vet.full_name}
                </p>
                <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>
                  {vet.role === 'vet_admin' ? 'Veterinario responsable' : 'Veterinario'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 6 — Página `/marketplace/veterinarios`

**Archivo:** `src/app/marketplace/veterinarios/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import MarketplaceVetCard from '@/components/marketplace/MarketplaceVetCard'
import { Search } from 'lucide-react'

export const metadata = { title: 'Veterinarios · Petfhans Marketplace' }

export default async function MarketplaceVetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const q    = params.q?.trim() ?? ''
  const page = Math.max(0, parseInt(params.page ?? '0', 10))
  const PAGE_SIZE = 20

  const admin = createAdminClient()

  let query = admin
    .from('profiles')
    .select('id, full_name, role, clinics!inner(id, name, slug, verified)')
    .in('role', ['veterinarian', 'vet_admin'])
    .eq('clinics.verified', true)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order('full_name', { ascending: true })

  if (q) {
    query = query.ilike('full_name', `%${q}%`)
  }

  const { data: vets } = await query

  return (
    <>
      <style>{`
        .vet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        @media (max-width: 640px) { .vet-grid { grid-template-columns: 1fr; } }
      `}</style>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ font: 'var(--pf-text-h1)', color: 'var(--pf-ink)', margin: '0 0 4px' }}>
          Veterinarios
        </h1>
        <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: 0 }}>
          Profesionales que atienden en clínicas verificadas
        </p>
      </header>

      <form method="GET" style={{ position: 'relative', maxWidth: 480 }}>
        <Search size={16} strokeWidth={2} style={{
          position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--pf-muted)', pointerEvents: 'none',
        }} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar veterinario…"
          className="pf-input"
          style={{ paddingLeft: 36 }}
        />
      </form>

      {(vets?.length ?? 0) > 0 ? (
        <div className="vet-grid">
          {(vets ?? []).map((vet: {
            id: string; full_name: string; role: string;
            clinics: Array<{ id: string; name: string; slug: string }>
          }) => (
            <MarketplaceVetCard key={vet.id} {...vet} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 6px' }}>
            No encontramos veterinarios
          </p>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: 0 }}>
            {q ? `Sin resultados para "${q}"` : 'No hay veterinarios disponibles aún.'}
          </p>
        </div>
      )}
    </>
  )
}
```

Verifica: `npx tsc --noEmit`

---

## Paso 7 — Redirect en `/marketplace`

**Archivo:** `src/app/marketplace/page.tsx`

```typescript
import { redirect } from 'next/navigation'
export default function MarketplacePage() {
  redirect('/marketplace/clinicas')
}
```

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

Navega manualmente con la app corriendo:
- `/marketplace` → debe redirigir a `/marketplace/clinicas`
- `/marketplace/clinicas` → debe cargar (aunque vacío si no hay clínicas verificadas)
- `/marketplace/veterinarios` → debe cargar
- Sin sesión → debe redirigir a `/auth/login`
- Consola del browser: 0 errores

Commit:
```bash
git add src/app/marketplace/ src/components/marketplace/
git commit -m "feat(C3): marketplace UI — clinicas, veterinarios, cards"
git push origin Develop
```

---

## Restricciones

- ❌ No implementar el botón "Solicitar atención" como funcional — es C.4
- ❌ No usar hexadecimales hardcodeados — solo tokens `var(--pf-*)`
- ❌ No usar emoji como iconos de UI
- ❌ No instalar dependencias nuevas
- ✅ Todos los estados: loading skeleton, empty, error
- ✅ Mobile-first para las páginas del marketplace
- ✅ `npx tsc --noEmit` después de cada paso antes de continuar

**La Fase C.4 solo puede arrancar después de que las 3 páginas carguen sin errores.**
