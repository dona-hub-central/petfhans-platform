# Prompt — Corrección de URLs: consistencia en español

Lee **CLAUDE.md** antes de empezar.

Luego lee:
```
skills-ai/incremental-implementation/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
```

---

## El problema

El código tiene dos palabras para lo mismo:
- `/owner/profile`  ← inglés (página de ajustes de cuenta)
- `/owner/perfil`   ← español (dashboard con widgets)

Esto generó confusión. Todas las URLs del portal owner deben estar
en **español** y ser semánticamente correctas.

---

## Mapa completo de cambios

| URL actual | URL nueva | Contenido | Nav label |
|------------|-----------|-----------|----------|
| `/owner/perfil` | `/owner/inicio` | Dashboard widgets (Hola, Wilmer) | Inicio |
| `/owner/profile` | `/owner/perfil` | Datos personales (nombre, email, tel) | Perfil |
| `/owner/dashboard` | `/owner/inicio` (ya redirige) | — redirect — | — |
| (no existe) | `/owner/settings` | Seguridad y contraseña | — |

Nav después del cambio:
```
Inicio → /owner/inicio       (dashboard widgets)
Marketplace → /marketplace/clinicas
Mis citas → /owner/appointments
Perfil → /owner/perfil       (datos de cuenta)
```

Sin "Mensajes" en nav (ya está en Acciones Rápidas del dashboard).

---

## TAREA 1 — Renombrar `/owner/perfil` → `/owner/inicio`

### 1A — Crear `/owner/inicio/page.tsx`

Lee `src/app/owner/perfil/page.tsx` completo.
Crea `src/app/owner/inicio/page.tsx` con el mismo contenido exacto.
Solo cambia el metadata:

```typescript
export const metadata = { title: 'Inicio · Petfhans' }
```

### 1B — Convertir `/owner/perfil/page.tsx` en redirect temporal

```typescript
// src/app/owner/perfil/page.tsx — TEMPORAL hasta TAREA 2
import { redirect } from 'next/navigation'
export default function PerfilRedirect() {
  redirect('/owner/inicio')
}
```

NOTA: Este redirect en `/owner/perfil` será REEMPLAZADO en TAREA 2
cuando movamos los datos de cuenta ahí.

### 1C — Actualizar todas las redirecciones post-login

Busca y reemplaza `/owner/perfil` por `/owner/inicio` en:

```bash
grep -rn "owner/perfil" src/ --include="*.ts" --include="*.tsx"
```

Archivos esperados:
- `src/app/page.tsx` (redirect raíz por rol)
- `src/app/auth/login/page.tsx` (ROLE_REDIRECTS)
- `src/app/auth/callback/route.ts`
- `src/app/auth/invite/page.tsx`
- `src/app/owner/dashboard/page.tsx` (ya redirige a /owner/perfil → cambiar a /owner/inicio)

En cada uno reemplaza:
```typescript
// Antes:
pet_owner: '/owner/perfil'
// Después:
pet_owner: '/owner/inicio'
```

```bash
npx tsc --noEmit
```
Commit: `refactor: rename /owner/perfil to /owner/inicio (dashboard widgets)`

---

## TAREA 2 — Mover datos de cuenta: `/owner/profile` → `/owner/perfil`

### 2A — Crear `/owner/perfil/page.tsx` con el contenido de settings

Lee `src/app/owner/profile/page.tsx` completo.

Reemplaza el contenido del redirect temporal de TAREA 1B por el
contenido real de la página de ajustes de cuenta (nombre, email,
teléfono, cambio de contraseña).

Cambia el metadata:
```typescript
export const metadata = { title: 'Mi perfil · Petfhans' }
```

### 2B — Convertir `/owner/profile` en redirect

```typescript
// src/app/owner/profile/page.tsx
import { redirect } from 'next/navigation'
export default function ProfileLegacyRedirect() {
  redirect('/owner/perfil')
}
```

Esto preserva cualquier link externo o guardado que apunte a `/owner/profile`.

### 2C — Buscar referencias internas a `/owner/profile`

```bash
grep -rn "owner/profile" src/ --include="*.ts" --include="*.tsx"
```

Actualiza cada ocurrencia a `/owner/perfil`.
No toques el archivo `/owner/profile/page.tsx` que acabas de convertir en redirect.

```bash
npx tsc --noEmit
```
Commit: `refactor: move account settings from /owner/profile to /owner/perfil`

---

## TAREA 3 — Crear `/owner/settings` (seguridad)

Si en `/owner/profile/page.tsx` original había una sección de
"Seguridad" (cambio de contraseña), muévela a `/owner/settings/page.tsx`
y deja en `/owner/perfil` solo los datos personales (nombre, email, tel).

Si no había sección de seguridad separada, crea `/owner/settings/page.tsx`
como una página simple de placeholder:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Configuración · Petfhans' }

export default async function OwnerSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{
        fontFamily: 'var(--pf-font-display)',
        fontSize: 24, fontWeight: 700, color: 'var(--pf-ink)',
        margin: '0 0 24px',
      }}>
        Configuración
      </h1>
      {/* Aquí irá: cambio de contraseña, notificaciones, etc. */}
      <p style={{ color: 'var(--pf-muted)', fontFamily: 'var(--pf-font-body)' }}>
        Próximamente: cambio de contraseña y preferencias de notificación.
      </p>
    </div>
  )
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: create /owner/settings page`

---

## TAREA 4 — Actualizar la navegación

Lee `src/components/owner/OwnerBottomNav.tsx` completo.

### Nuevo array `items`

```typescript
import { Home, Store, Calendar, User, Plus, PawPrint } from 'lucide-react'
// Quitar MessageSquare del import

const items = [
  { href: '/owner/inicio',         Icon: Home,     label: 'Inicio',      match: '/owner/inicio' },
  { href: '/marketplace/clinicas', Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',   Icon: Calendar, label: 'Mis citas',   match: '/owner/appointments' },
  { href: '/owner/perfil',         Icon: User,     label: 'Perfil',      match: '/owner/perfil' },
] as const
```

### Grid mobile — 4 items + FAB = 5 columnas

Busca la regla `.pf-own-bot-inner` y cambia el grid:
```css
/* Antes (6 columnas, tenía Mensajes): */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr 1fr;

/* Después (5 columnas, sin Mensajes): */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
```

### Distribución mobile con 4 items:

```
Inicio | Marketplace | [FAB Pedir cita] | Mis citas | Perfil
```

En el JSX del mobile:
```tsx
{items.slice(0, 2).map(item => (
  <BottomLink key={item.href} item={item}
    active={path.startsWith(item.match) && !fabActive} />
))}

<Link href="/owner/appointments/new" className="pf-own-fab" ...>
  ...
</Link>

{items.slice(2).map(item => (
  <BottomLink key={item.href} item={item}
    active={path.startsWith(item.match) && !fabActive} />
))}
```

### Sidebar desktop — mismo array, sin cambios adicionales

El sidebar ya usa el array `items` en un `.map()` — al actualizar el
array automáticamente refleja los cambios en el sidebar.

```bash
npx tsc --noEmit
```
Commit: `fix: update nav — Inicio→/owner/inicio, Perfil→/owner/perfil, remove Mensajes`

---

## TAREA 5 — Perfil de mascota editable (tab Ficha)

Actualmente kitty muestra todos los campos vacíos (Raza —, Edad —,
Peso —, Microchip —) y no hay forma de editarlos desde el portal owner.

### 5A — API route PATCH `/api/owner/pets/[id]`

Verifica si existe `src/app/api/owner/pets/[id]/route.ts`:

```bash
ls src/app/api/owner/pets/
```

Si no existe, créalo:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateSchema = z.object({
  name:       z.string().min(1).max(100).trim().optional(),
  breed:      z.string().max(100).trim().nullable().optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  weight:     z.number().positive().max(999).nullable().optional(),
  gender:     z.enum(['male', 'female', 'unknown']).nullable().optional(),
  neutered:   z.boolean().nullable().optional(),
  microchip:  z.string().max(50).trim().nullable().optional(),
  notes:      z.string().max(1000).trim().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const { id: petId } = await params

  // Verificar ownership via pet.owner_id
  const { data: pet } = await admin
    .from('pets').select('id, owner_id').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  if (profile.role === 'pet_owner' && pet.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Sin permiso sobre esta mascota' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { error } = await admin
    .from('pets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', petId)

  if (error) {
    console.error('[PATCH /api/owner/pets/[id]]', error.message)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add PATCH /api/owner/pets/[id]`

### 5B — UI editable en OwnerPetView — tab Ficha

Lee `src/components/owner/OwnerPetView.tsx` completo.

Este componente ya es `'use client'`. Añade estado de edición:

```tsx
const router = useRouter()  // importar de next/navigation si no está

const [editing, setEditing] = useState(false)
const [saving,  setSaving]  = useState(false)
const [error,   setError]   = useState<string | null>(null)
const [form, setForm] = useState({
  name:       pet.name       ?? '',
  breed:      pet.breed      ?? '',
  birth_date: pet.birth_date ?? '',
  weight:     pet.weight != null ? String(pet.weight) : '',
  gender:     pet.gender     ?? '',
  neutered:   pet.neutered   ?? false,
  microchip:  pet.microchip  ?? '',
  notes:      pet.notes      ?? '',
})

async function handleSave() {
  setSaving(true); setError(null)
  try {
    const res = await fetch(`/api/owner/pets/${pet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:       form.name || undefined,
        breed:      form.breed      || null,
        birth_date: form.birth_date || null,
        weight:     form.weight ? parseFloat(form.weight) : null,
        gender:     form.gender     || null,
        neutered:   form.neutered,
        microchip:  form.microchip  || null,
        notes:      form.notes      || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al guardar')
    } else {
      setEditing(false)
      router.refresh()
    }
  } catch {
    setError('Error de conexión')
  } finally {
    setSaving(false)
  }
}
```

En la sección `tab === 'info'` (o `tab === 'ficha'`, verifica el nombre exacto):

```tsx
{/* Botón editar — modo lectura */}
{!editing && (
  <>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button onClick={() => setEditing(true)} className="pf-pet-edit-btn">
        Editar perfil
      </button>
    </div>
    {/* tabla de datos existente sin cambios */}
  </>
)}

{/* Formulario — modo edición */}
{editing && (
  <div className="pf-pet-form">
    <p className="pf-pet-form-title">Editar perfil de {pet.name}</p>

    {error && (
      <p style={{ color: 'var(--pf-error)', fontSize: 13, margin: '0 0 12px' }}>{error}</p>
    )}

    {[
      { key: 'name',       label: 'Nombre',             type: 'text',   placeholder: '' },
      { key: 'breed',      label: 'Raza',               type: 'text',   placeholder: 'Ej: Siamés' },
      { key: 'birth_date', label: 'Fecha de nacimiento',type: 'date',   placeholder: '' },
      { key: 'weight',     label: 'Peso (kg)',           type: 'number', placeholder: 'Ej: 4.5' },
      { key: 'microchip',  label: 'Microchip',          type: 'text',   placeholder: 'Número de microchip' },
    ].map(field => (
      <label key={field.key} className="pf-pet-label">
        {field.label}
        <input
          type={field.type}
          step={field.type === 'number' ? '0.1' : undefined}
          min={field.type === 'number' ? '0' : undefined}
          className="pf-pet-input"
          placeholder={field.placeholder}
          value={form[field.key as keyof typeof form] as string}
          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
        />
      </label>
    ))}

    <label className="pf-pet-label">
      Sexo
      <select className="pf-pet-input"
        value={form.gender}
        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
        <option value="">No especificado</option>
        <option value="male">Macho</option>
        <option value="female">Hembra</option>
        <option value="unknown">Desconocido</option>
      </select>
    </label>

    <label className="pf-pet-label">
      Castrado/a
      <select className="pf-pet-input"
        value={form.neutered ? 'true' : 'false'}
        onChange={e => setForm(f => ({ ...f, neutered: e.target.value === 'true' }))}>
        <option value="false">No</option>
        <option value="true">Sí</option>
      </select>
    </label>

    <label className="pf-pet-label">
      Notas personales
      <textarea className="pf-pet-input pf-pet-textarea"
        placeholder="Alergias, comportamiento, preferencias..."
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
    </label>

    <div className="pf-pet-actions">
      <button onClick={() => { setEditing(false); setError(null) }}
        className="pf-pet-cancel" disabled={saving}>Cancelar</button>
      <button onClick={handleSave}
        className="pf-pet-save" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  </div>
)}
```

Añade este CSS al bloque `<style>` del componente:

```css
.pf-pet-edit-btn {
  padding: 8px 16px; border-radius: 10px;
  border: 1px solid var(--pf-border); background: var(--pf-surface);
  font-family: var(--pf-font-body); font-size: 13px; font-weight: 600;
  color: var(--pf-ink); cursor: pointer; transition: background .15s;
}
.pf-pet-edit-btn:hover { background: var(--pf-coral-soft); color: var(--pf-coral); }
.pf-pet-form { display: flex; flex-direction: column; gap: 14px; }
.pf-pet-form-title {
  font-family: var(--pf-font-display); font-size: 17px; font-weight: 700;
  color: var(--pf-ink); margin: 0;
}
.pf-pet-label {
  display: flex; flex-direction: column; gap: 6px;
  font-family: var(--pf-font-body); font-size: 11px; font-weight: 700;
  color: var(--pf-muted); text-transform: uppercase; letter-spacing: .05em;
}
.pf-pet-input {
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--pf-border); background: var(--pf-surface);
  font-family: var(--pf-font-body); font-size: 14px; color: var(--pf-ink);
  outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box;
}
.pf-pet-input:focus { border-color: var(--pf-coral); }
.pf-pet-textarea { min-height: 80px; resize: vertical; }
.pf-pet-actions {
  display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px;
}
.pf-pet-cancel {
  padding: 10px 18px; border-radius: 10px; border: 1px solid var(--pf-border);
  background: transparent; font-family: var(--pf-font-body);
  font-size: 14px; font-weight: 600; color: var(--pf-muted); cursor: pointer;
}
.pf-pet-save {
  padding: 10px 18px; border-radius: 10px; border: none;
  background: var(--pf-coral); color: #fff; font-family: var(--pf-font-body);
  font-size: 14px; font-weight: 700; cursor: pointer; transition: background .15s;
}
.pf-pet-save:hover:not(:disabled) { background: var(--pf-coral-dark); }
.pf-pet-save:disabled, .pf-pet-cancel:disabled { opacity: .6; cursor: not-allowed; }
```

```bash
npx tsc --noEmit
```
Commit: `feat: pet profile editable in Ficha tab`

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

**Prueba manual — checklist:**

1. Login como owner → llega a `/owner/inicio` (dashboard widgets: Hola Wilmer)
2. Nav desktop sidebar: Inicio | Marketplace | Mis citas | Perfil
3. Nav mobile: Inicio | Marketplace | [FAB] | Mis citas | Perfil
4. Clic nav "Inicio" → `/owner/inicio` (dashboard con widgets)
5. Clic nav "Perfil" → `/owner/perfil` (datos personales: nombre, email, teléfono)
6. Ir a `/owner/settings` → página de configuración/seguridad
7. Ir a `/owner/profile` → redirect automático a `/owner/perfil`
8. Ir a `/owner/dashboard` → redirect automático a `/owner/inicio`
9. Entrar al perfil de kitty → pestaña Ficha → ver botón "Editar perfil"
10. Editar raza "Siamés", peso 3.5 → guardar → los datos aparecen en la ficha
11. Recargar → datos persisten
12. Widget del dashboard → kitty muestra raza y peso actualizados (refresca con router.refresh)

PR: `fix: consistent Spanish URLs — /inicio /perfil /settings + editable pet profile`

---

## Restricciones

- ❌ No toques `src/app/vet/` ni `src/app/admin/`
- ❌ No modifiques migraciones de Supabase
- ❌ No instales dependencias nuevas
- ✅ Un commit por tarea
- ✅ `npx tsc --noEmit` después de cada cambio
- ✅ Todas las URLs en español: `/inicio`, `/perfil`, `/settings`, `/citas`, etc.
