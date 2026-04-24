# Fase C.2 — API Routes de solo lectura del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las rutas GET del marketplace — búsqueda y perfiles públicos.
**Rama:** Develop
**Prerequisito:** Fase C.1 completada — tablas `care_requests`, `clinic_blocks`, `clinic_join_requests` existen en Supabase.

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md
skills-ai/api-and-interface-design/SKILL.md
skills-ai/security-and-hardening/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

Verifica el prerequisito:
```bash
grep -r "care_requests" supabase/migrations/ --include="*.sql" -l
# Debe mostrar 017_marketplace_tables.sql
```

---

## Reglas para todas las rutas de esta sesión

1. **Auth obligatorio** — todas las rutas requieren sesión activa (el marketplace no es público)
2. **Sin clinic_id como scope** — estas rutas son de descubrimiento, no de gestión por clínica
3. **Solo lectura** — GET únicamente, sin mutaciones
4. **Paginación** — todas las listas usan `.range(offset, offset + PAGE_SIZE - 1)`
5. **clinic_blocks** — las clínicas donde el usuario está bloqueado no aparecen en listados

---

## Ruta 1 — `GET /api/marketplace/clinics`

**Archivo a crear:** `src/app/api/marketplace/clinics/route.ts`

Comportamiento:
- Requiere sesión activa → 401 si no hay usuario
- Devuelve clínicas con `verified = true` y `public_profile` no nulo
- Excluye clínicas donde el usuario autenticado está bloqueado (`clinic_blocks`)
- Query params: `q` (búsqueda por nombre o ciudad), `page` (default 0)
- PAGE_SIZE = 20
- Orden por `rating_avg DESC`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 20

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()

  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

  const admin = createAdminClient()

  // Clínicas donde el usuario está bloqueado
  const { data: blocked } = await admin
    .from('clinic_blocks')
    .select('clinic_id')
    .eq('profile_id', profile?.id ?? '')

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

  const { data: clinics, error } = await query

  if (error) {
    console.error('[marketplace/clinics GET]', error)
    return NextResponse.json({ error: 'Error al obtener clínicas' }, { status: 500 })
  }

  return NextResponse.json({
    clinics: clinics ?? [],
    page,
    hasMore: (clinics?.length ?? 0) === PAGE_SIZE,
  })
}
```

---

## Ruta 2 — `GET /api/marketplace/clinics/[slug]`

**Archivo a crear:** `src/app/api/marketplace/clinics/[slug]/route.ts`

Comportamiento:
- Requiere sesión activa
- Devuelve el perfil público de la clínica + equipo de vets
- Incluye campo `blocked: boolean` — si el usuario está bloqueado en esa clínica
- 404 si la clínica no existe o no está verificada

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slug } = await params
  const admin = createAdminClient()

  const { data: clinic } = await admin
    .from('clinics')
    .select('id, name, slug, city, verified, public_profile, rating_avg, rating_count')
    .eq('slug', slug)
    .eq('verified', true)
    .single()

  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  // Profile del usuario autenticado
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()

  // ¿Está el usuario bloqueado en esta clínica?
  const { data: block } = await admin
    .from('clinic_blocks')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('profile_id', profile?.id ?? '')
    .maybeSingle()

  // Equipo público de la clínica
  const { data: team } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('clinic_id', clinic.id)
    .in('role', ['veterinarian', 'vet_admin'])

  return NextResponse.json({
    clinic,
    team: team ?? [],
    blocked: !!block,
  })
}
```

---

## Ruta 3 — `GET /api/marketplace/vets`

**Archivo a crear:** `src/app/api/marketplace/vets/route.ts`

Comportamiento:
- Requiere sesión activa
- Devuelve veterinarios que pertenecen a al menos una clínica verificada
- Query params: `q` (búsqueda por nombre), `page` (default 0)
- PAGE_SIZE = 20

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 20

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

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

  const { data: vets, error } = await query

  if (error) {
    console.error('[marketplace/vets GET]', error)
    return NextResponse.json({ error: 'Error al obtener veterinarios' }, { status: 500 })
  }

  return NextResponse.json({
    vets: vets ?? [],
    page,
    hasMore: (vets?.length ?? 0) === PAGE_SIZE,
  })
}
```

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

Prueba las rutas con la app corriendo en localhost:
```bash
# Deben devolver 200 con arrays vacíos (no 401 ni 500)
curl -s http://localhost:3000/api/marketplace/clinics \
  -H "Cookie: [cookies de sesión activa]" | python3 -m json.tool

curl -s http://localhost:3000/api/marketplace/vets \
  -H "Cookie: [cookies de sesión activa]" | python3 -m json.tool
```

Commit:
```bash
git add src/app/api/marketplace/
git commit -m "feat(C2): marketplace GET routes — clinics, clinics/[slug], vets"
git push origin Develop
```

---

## Restricciones

- ❌ No crear rutas POST en esta sesión — eso es C.4
- ❌ No tocar archivos existentes en `src/app/api/`
- ❌ No instalar dependencias
- ✅ Solo crear archivos nuevos en `src/app/api/marketplace/`
- ✅ `npx tsc --noEmit` debe pasar después de cada archivo
- ✅ `npm run build` debe pasar antes del commit

**La Fase C.3 solo puede arrancar después de que las 3 rutas devuelvan 200.**
