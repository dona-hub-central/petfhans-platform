# Fase B.5 — UI: ClinicSelector + /vet/select-clinic + VetLayout multi-clínica
## Sesión independiente de Claude Code

**Objetivo:** Crear el componente `ClinicSelector` (dropdown que escribe la cookie
`active_clinic_id`), la página `/vet/select-clinic` (selección inicial cuando no hay
cookie), y actualizar `vet/layout.tsx` y `VetLayout.tsx` para mostrar el selector
y usar `profile_clinics` como fuente de datos de clínicas.

**Rama:** Develop  
**Riesgo:** MEDIO — toca la navegación del panel veterinario  
**Prerequisito:** B.1, B.2, B.3 y B.4 completadas

---

## Antes de empezar

### 1. Lee estos documentos
```
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

### 2. Lee los archivos que vas a modificar
```bash
cat src/app/vet/layout.tsx
cat src/components/shared/VetLayout.tsx
cat src/app/vet/dashboard/page.tsx
```

### 3. Entiende el estado actual

`vet/layout.tsx` hace:
```typescript
const { data: profile } = await admin.from('profiles')
  .select('role, full_name, clinic_id, clinics(id, name, slug, ...)')
  .eq('user_id', user.id).single()
```
Pasa `clinicName`, `userName`, `clinicSlug` a `VetLayout`.

`VetLayout.tsx` recibe esas props y las muestra en el sidebar.

En Fase B, el layout debe:
1. Obtener TODAS las clínicas del usuario desde `profile_clinics`
2. Leer la cookie `active_clinic_id` para saber cuál está activa
3. Si no hay cookie → redirect a `/vet/select-clinic`
4. Pasar `clinics[]` y `activeClinicId` a `VetLayout`

---

## Paso B.5.1 — Crear `src/components/shared/ClinicSelector.tsx`

Este es un Client Component. Lee los tokens de diseño en `src/app/globals.css`
antes de escribir estilos.

```typescript
'use client'
import { useRouter } from 'next/navigation'

interface Clinic {
  id: string
  name: string
}

interface Props {
  clinics: Clinic[]
  activeClinicId: string
}

export default function ClinicSelector({ clinics, activeClinicId }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newClinicId = e.target.value
    // Escribe la cookie en el cliente — SameSite=Lax, sin HttpOnly para que
    // el client component pueda escribirla. El middleware la lee en cada request.
    document.cookie = `active_clinic_id=${newClinicId}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`
    router.refresh()
  }

  if (clinics.length <= 1) {
    // Con una sola clínica no hay selector — mostrar solo el nombre
    return (
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)', truncate: 'true' }}>
        {clinics[0]?.name ?? '—'}
      </span>
    )
  }

  return (
    <select
      value={activeClinicId}
      onChange={handleChange}
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--pf-ink)',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        fontFamily: 'var(--pf-font-body)',
      }}
    >
      {clinics.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
```

```bash
npx tsc --noEmit
git add src/components/shared/ClinicSelector.tsx
git commit -m "feat(B5): ClinicSelector — dropdown que escribe cookie active_clinic_id"
git push origin Develop
```

---

## Paso B.5.2 — Crear `src/app/vet/select-clinic/page.tsx`

Esta página aparece cuando el vet llega sin cookie `active_clinic_id`.
Es un Server Component que muestra las clínicas del usuario y permite elegir.

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ClinicSelectorPage from '@/components/shared/ClinicSelectorPage'

export const metadata = { title: 'Seleccionar clínica · Petfhans' }

export default async function SelectClinicPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: memberships } = await admin.from('profile_clinics')
    .select('clinic_id, role, clinics(id, name, slug)')
    .eq('user_id', user.id)
    .order('created_at')

  const clinics = (memberships ?? []).map(m => {
    type M = typeof m & { clinics: { id: string; name: string; slug: string } | null }
    const clinic = (m as M).clinics
    return { id: clinic?.id ?? m.clinic_id, name: clinic?.name ?? '—', slug: clinic?.slug ?? '' }
  })

  if (clinics.length === 1) {
    // Solo una clínica — redirigir automáticamente (la cookie la setea el layout)
    redirect('/vet/dashboard')
  }

  return <ClinicSelectorPage clinics={clinics} />
}
```

Crea también `src/components/shared/ClinicSelectorPage.tsx` (Client Component):

```typescript
'use client'
import { useRouter } from 'next/navigation'

interface Clinic { id: string; name: string; slug: string }

export default function ClinicSelectorPage({ clinics }: { clinics: Clinic[] }) {
  const router = useRouter()

  function select(clinicId: string) {
    document.cookie = `active_clinic_id=${clinicId}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`
    router.push('/vet/dashboard')
  }

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--pf-bg)',
      fontFamily: 'var(--pf-font-body)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        border: '1px solid var(--pf-border)', maxWidth: 420, width: '100%',
        boxShadow: 'var(--pf-shadow-card)',
      }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--pf-ink)',
          margin: '0 0 6px', fontFamily: 'var(--pf-font-display)',
        }}>
          Selecciona tu clínica
        </h1>
        <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 24px' }}>
          Perteneces a varias clínicas. Elige con cuál quieres trabajar ahora.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clinics.map(c => (
            <button
              key={c.id}
              onClick={() => select(c.id)}
              style={{
                padding: '14px 18px', borderRadius: 12, border: '1px solid var(--pf-border)',
                background: '#fff', cursor: 'pointer', textAlign: 'left',
                fontSize: 15, fontWeight: 600, color: 'var(--pf-ink)',
                fontFamily: 'var(--pf-font-body)', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--pf-coral)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--pf-border)')}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

```bash
npx tsc --noEmit
git add src/app/vet/select-clinic/page.tsx src/components/shared/ClinicSelectorPage.tsx
git commit -m "feat(B5): crear /vet/select-clinic — selección de clínica activa"
git push origin Develop
```

---

## Paso B.5.3 — Actualizar `src/app/vet/layout.tsx`

Lee el archivo completo antes de editar.

### Cambios a hacer:

1. **Importa `cookies`** de `next/headers`:
```typescript
import { cookies } from 'next/headers'
```

2. **Obtén las clínicas del usuario** desde `profile_clinics` (en lugar de solo `profiles`):
```typescript
const { data: memberships } = await admin.from('profile_clinics')
  .select('clinic_id, role, clinics(id, name, slug, subscription_plan)')
  .eq('user_id', user.id)
  .order('created_at')

type MembershipRow = {
  clinic_id: string
  role: string
  clinics: { id: string; name: string; slug: string; subscription_plan: string } | null
}
const clinics = ((memberships ?? []) as MembershipRow[]).map(m => ({
  id: m.clinics?.id ?? m.clinic_id,
  name: m.clinics?.name ?? '—',
  slug: m.clinics?.slug ?? '',
  subscription_plan: m.clinics?.subscription_plan ?? 'trial',
}))
```

3. **Lee la cookie activa**:
```typescript
const cookieStore = await cookies()
const cookieClinicId = cookieStore.get('active_clinic_id')?.value
const activeClinicId = clinics.find(c => c.id === cookieClinicId)?.id ?? clinics[0]?.id ?? ''
```

4. **Redirect a select-clinic** si hay más de una y no hay cookie válida:
```typescript
if (clinics.length > 1 && !clinics.find(c => c.id === cookieClinicId)) {
  redirect('/vet/select-clinic')
}
```

5. **Pasa las nuevas props a VetLayout** — reemplaza las props de clínica actuales
con las nuevas (ver B.5.4 para los props exactos).

6. **Mantén** la lectura de `profile.role`, `profile.full_name` para userName y role
   — esas no cambian.

```bash
npx tsc --noEmit
git add src/app/vet/layout.tsx
git commit -m "feat(B5): vet/layout usa profile_clinics y cookie active_clinic_id"
git push origin Develop
```

---

## Paso B.5.4 — Actualizar `src/components/shared/VetLayout.tsx`

Lee el archivo completo. Identifica las props actuales (`clinicName`, `clinicSlug`, etc.).

### Cambios a hacer:

1. **Añade las nuevas props** a la interfaz de props:
```typescript
interface VetLayoutProps {
  // ... props existentes ...
  clinics: Array<{ id: string; name: string }>
  activeClinicId: string
}
```

2. **Importa `ClinicSelector`**:
```typescript
import ClinicSelector from '@/components/shared/ClinicSelector'
```

3. **En la sección del sidebar donde aparece el nombre de la clínica**, reemplaza
el texto estático por `<ClinicSelector clinics={clinics} activeClinicId={activeClinicId} />`.

4. **Mantén** la compatibilidad con el `clinicName` existente para el resto de la UI
   (breadcrumbs, títulos de página) — puedes derivarlo del clinic activo:
```typescript
const activeClinic = clinics.find(c => c.id === activeClinicId)
const clinicName = activeClinic?.name ?? ''
```

```bash
npx tsc --noEmit
git add src/components/shared/VetLayout.tsx
git commit -m "feat(B5): VetLayout integra ClinicSelector en sidebar"
git push origin Develop
```

---

## Paso B.5.5 — Actualizar `src/app/vet/dashboard/page.tsx`

Lee el archivo. Localiza las 4 queries que usan `profile.clinic_id` o `clinicId`
como scope. Cámbialas para leer `activeClinicId` de la cookie:

```typescript
import { cookies } from 'next/headers'
// ...
const cookieStore = await cookies()
const activeClinicId = cookieStore.get('active_clinic_id')?.value
if (!activeClinicId) redirect('/vet/select-clinic')
```

Usa `activeClinicId` en todas las queries en lugar del clinic_id escalar del perfil.

```bash
npx tsc --noEmit
git add src/app/vet/dashboard/page.tsx
git commit -m "feat(B5): vet/dashboard usa cookie active_clinic_id como scope"
git push origin Develop
```

---

## Verificación final de la sesión

```bash
# No deben quedar referencias a profile.clinic_id en los archivos de UI tocados
grep -n "profile\.clinic_id\|clinicId.*profile" \
  src/app/vet/layout.tsx \
  src/app/vet/dashboard/page.tsx \
  src/components/shared/VetLayout.tsx

npx tsc --noEmit
```

Prueba manual:
1. Inicia sesión como vet con una sola clínica → debe llegar a `/vet/dashboard` sin pasar por select-clinic
2. Inicia sesión como vet con dos clínicas (si existe en tu BD de dev) → debe redirigir a `/vet/select-clinic`
3. Selecciona una clínica → cookie seteada → dashboard carga datos de esa clínica
4. El selector en el sidebar muestra las clínicas disponibles

---

## Checklist de cierre de B.5

- [ ] `ClinicSelector.tsx` creado — escribe cookie + router.refresh()
- [ ] `ClinicSelectorPage.tsx` creado — botones por clínica
- [ ] `/vet/select-clinic/page.tsx` creado — redirect automático si solo hay una
- [ ] `vet/layout.tsx` usa `profile_clinics`, lee cookie, redirect si multi y sin cookie
- [ ] `VetLayout.tsx` tiene props `clinics[]` + `activeClinicId` + `ClinicSelector`
- [ ] `vet/dashboard/page.tsx` usa `active_clinic_id` de cookie como scope
- [ ] 5 commits, `npx tsc --noEmit` pasa
- [ ] Prueba manual completada

---

## Restricciones

- ❌ No eliminar `profiles.clinic_id` ni el campo del SELECT de profiles — B.6 lo hace
- ❌ No tocar las 10 API routes ya migradas en B.3 y B.4
- ❌ No añadir estilos con colores hex — usar tokens `--pf-*`
- ✅ Un commit por paso (B.5.1 → B.5.5)
- ✅ `npx tsc --noEmit` después de cada paso

**STOP — B.6 (deprecación) requiere ≥48h en producción sin incidencias. No ejecutar en esta sesión.**
