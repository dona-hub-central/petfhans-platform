# Prompt — Corrección definitiva de URLs del portal owner

Lee **CLAUDE.md** antes de empezar.

Luego lee:
```
skills-ai/incremental-implementation/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
```

---

## Mapa de cambios

| URL actual | URL nueva | Contenido |
|------------|-----------|----------|
| `/owner/perfil` | `/owner/dashboard` | Dashboard con widgets (Hola Wilmer) |
| `/owner/profile` | `/owner/settings` | Cuenta (nombre, email, teléfono) + Seguridad |
| `/owner/dashboard` | `/owner/dashboard` | Ya existía como redirect — ahora es la página real |

Las URLs `/owner/inicio` y `/owner/home` quedan **libres** — será la
futura landing page del portal. **No crear ni tocar nada en esas rutas.**

---

## TAREA 1 — `/owner/perfil` → `/owner/dashboard`

### 1A — Leer el archivo actual

Lee `src/app/owner/perfil/page.tsx` completo.

### 1B — Crear `src/app/owner/dashboard/page.tsx` con el contenido real

El archivo `src/app/owner/dashboard/page.tsx` existe actualmente como
un redirect a `/owner/perfil`. Reemplaza ese redirect con el contenido
completo de `src/app/owner/perfil/page.tsx`.

Actualiza el metadata:
```typescript
export const metadata = { title: 'Inicio · Petfhans' }
```

### 1C — Convertir `/owner/perfil/page.tsx` en redirect

```typescript
// src/app/owner/perfil/page.tsx
import { redirect } from 'next/navigation'
export default function PerfilLegacyRedirect() {
  redirect('/owner/dashboard')
}
```

Esto preserva cualquier URL guardada que apunte a `/owner/perfil`.

### 1D — Actualizar todas las redirecciones post-login

Busca todas las referencias a `/owner/perfil` en el código:

```bash
grep -rn "owner/perfil" src/ --include="*.ts" --include="*.tsx"
```

Reemplaza cada ocurrencia de `/owner/perfil` por `/owner/dashboard` en:
- `src/app/page.tsx` (redirect raíz por rol)
- `src/app/auth/login/page.tsx` (ROLE_REDIRECTS)
- `src/app/auth/callback/route.ts`
- `src/app/auth/invite/page.tsx`
- Cualquier otro archivo que aparezca en el grep

NO toques `src/app/owner/perfil/page.tsx` (que ya convertimos en redirect).

```bash
npx tsc --noEmit
```
Commit: `refactor: move dashboard from /owner/perfil to /owner/dashboard`

---

## TAREA 2 — `/owner/profile` → `/owner/settings`

### 2A — Leer el archivo actual

Lee `src/app/owner/profile/page.tsx` completo.

### 2B — Crear `src/app/owner/settings/page.tsx`

Crea la carpeta y archivo `src/app/owner/settings/page.tsx` con el
contenido exacto de `src/app/owner/profile/page.tsx`.

Actualiza el metadata:
```typescript
export const metadata = { title: 'Mi cuenta · Petfhans' }
```

Si la página de profile tenía solo datos personales (nombre, email,
teléfono) sin una sección de seguridad separada, manéjalo todo
dentro de `/owner/settings` en una sola página con dos secciones:
1. **Datos personales** — nombre, email, teléfono
2. **Seguridad** — cambio de contraseña

Si ya tenía las dos secciones, simplemente mueve el contenido.

### 2C — Convertir `/owner/profile/page.tsx` en redirect

```typescript
// src/app/owner/profile/page.tsx
import { redirect } from 'next/navigation'
export default function ProfileLegacyRedirect() {
  redirect('/owner/settings')
}
```

### 2D — Actualizar referencias internas

```bash
grep -rn "owner/profile" src/ --include="*.ts" --include="*.tsx"
```

Reemplaza cada ocurrencia de `/owner/profile` por `/owner/settings`.
No toques `src/app/owner/profile/page.tsx` (ya es redirect).

```bash
npx tsc --noEmit
```
Commit: `refactor: move account settings from /owner/profile to /owner/settings`

---

## TAREA 3 — Actualizar la navegación

Lee `src/components/owner/OwnerBottomNav.tsx` completo.

### Nuevo array `items`

```typescript
import { Home, Store, Calendar, User, Plus, PawPrint } from 'lucide-react'
// Quitar MessageSquare e importar solo los necesarios

const items = [
  { href: '/owner/dashboard',      Icon: Home,     label: 'Inicio',      match: '/owner/dashboard' },
  { href: '/marketplace/clinicas', Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',   Icon: Calendar, label: 'Mis citas',   match: '/owner/appointments' },
  { href: '/owner/settings',       Icon: User,     label: 'Perfil',      match: '/owner/settings' },
] as const
```

**Por qué este array:**
- "Inicio" → `/owner/dashboard` (el dashboard con widgets es el home del owner)
- "Perfil" → `/owner/settings` (datos de cuenta + seguridad)
- Sin "Mensajes" (ya está en el widget de Acciones Rápidas del dashboard)
- `/owner/inicio` y `/owner/home` NO aparecen en nav — quedan libres para landing

### Grid mobile — 4 items + FAB = 5 columnas

Busca `.pf-own-bot-inner` y cambia:
```css
/* Antes (6 columnas): */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr 1fr;

/* Después (5 columnas): */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
```

### Distribución mobile — 2 items antes del FAB, 2 después:

```tsx
{items.slice(0, 2).map(item => (
  <BottomLink key={item.href} item={item}
    active={path.startsWith(item.match) && !fabActive} />
))}

<Link href="/owner/appointments/new" className="pf-own-fab"
  aria-label="Pedir cita" data-active={fabActive ? 'true' : 'false'}>
  <span className="pf-own-fab-circle">
    <Plus size={26} strokeWidth={2.5} />
  </span>
  <span className="pf-own-fab-label">Pedir cita</span>
</Link>

{items.slice(2).map(item => (
  <BottomLink key={item.href} item={item}
    active={path.startsWith(item.match) && !fabActive} />
))}
```

Resultado mobile: `Inicio | Marketplace | [FAB] | Mis citas | Perfil`

### Sidebar desktop — logo como link al dashboard

El brand del sidebar debe ser un link al dashboard:

```tsx
// Antes:
<div className="pf-own-side-brand">

// Después:
<Link href="/owner/dashboard" className="pf-own-side-brand" style={{ textDecoration: 'none' }}>
```

Esto permite que el owner vuelva al dashboard desde cualquier página
haciendo clic en el logo de Petfhans, sin necesitar un tab adicional.

```bash
npx tsc --noEmit
```
Commit: `fix: update nav — Inicio→/dashboard, Perfil→/settings, remove Mensajes`

---

## TAREA 4 — Actualizar links dentro de los widgets del dashboard

El dashboard en `/owner/dashboard` puede tener links que apuntaban a
`/owner/perfil` o `/owner/profile`. Verifica y actualiza:

```bash
grep -rn "owner/perfil\|owner/profile" src/components/owner/dashboard/ --include="*.tsx"
```

En los widgets, el botón "Ver perfil completo" de la mascota NO cambia
(apunta a `/owner/pets/{id}`, no a perfil de usuario).

Si hay algún link a los datos de cuenta del usuario dentro de los
widgets, actualiza a `/owner/settings`.

```bash
npx tsc --noEmit
```
Commit: `fix: update dashboard widget links to new URLs`

---

## TAREA 5 — Perfil de mascota editable (tab Ficha)

### 5A — API route PATCH `/api/owner/pets/[id]`

Verifica si ya existe `src/app/api/owner/pets/[id]/route.ts`:

```bash
ls src/app/api/owner/pets/ 2>/dev/null || echo "no existe"
```

Si no existe, créalo en `src/app/api/owner/pets/[id]/route.ts`:

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
  const { data: pet } = await admin
    .from('pets').select('id, owner_id').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  if (profile.role === 'pet_owner' && pet.owner_id !== profile.id)
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })

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

### 5B — Formulario editable en OwnerPetView (tab Ficha)

Lee `src/components/owner/OwnerPetView.tsx` completo.

Este componente ya es `'use client'`. Añade al inicio del componente:

```typescript
import { useRouter } from 'next/navigation'  // si no está importado

// Dentro del componente, antes del return:
const router = useRouter()
const [editing, setEditing] = useState(false)
const [saving,  setSaving]  = useState(false)
const [saveError, setSaveError] = useState<string | null>(null)
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
  setSaving(true); setSaveError(null)
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
      setSaveError(data.error ?? 'Error al guardar')
    } else {
      setEditing(false)
      router.refresh()
    }
  } catch {
    setSaveError('Error de conexión')
  } finally {
    setSaving(false)
  }
}
```

En el bloque del tab `'info'` (o el nombre exacto que uses, verifícalo
leyendo el archivo — puede ser `'ficha'`, `'info'` u otro):

```tsx
{/* BOTÓN EDITAR — modo lectura */}
{!editing && (
  <>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button onClick={() => setEditing(true)} className="pf-pet-edit-btn">
        Editar perfil
      </button>
    </div>
    {/* La tabla de datos existente va aquí sin cambios */}
  </>
)}

{/* FORMULARIO — modo edición */}
{editing && (
  <div className="pf-pet-form">
    <p className="pf-pet-form-title">Editar perfil de {pet.name}</p>

    {saveError && (
      <p style={{ color: 'var(--pf-coral)', fontSize: 13, margin: '0 0 8px' }}>{saveError}</p>
    )}

    {[
      { key: 'name',       label: 'Nombre',              type: 'text',   placeholder: '' },
      { key: 'breed',      label: 'Raza',                type: 'text',   placeholder: 'Ej: Siamés' },
      { key: 'birth_date', label: 'Fecha de nacimiento', type: 'date',   placeholder: '' },
      { key: 'weight',     label: 'Peso (kg)',            type: 'number', placeholder: 'Ej: 4.5' },
      { key: 'microchip',  label: 'Microchip',           type: 'text',   placeholder: 'Número de microchip' },
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

    <label className="pf-pet-label">Sexo
      <select className="pf-pet-input" value={form.gender}
        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
        <option value="">No especificado</option>
        <option value="male">Macho</option>
        <option value="female">Hembra</option>
        <option value="unknown">Desconocido</option>
      </select>
    </label>

    <label className="pf-pet-label">Castrado/a
      <select className="pf-pet-input"
        value={form.neutered ? 'true' : 'false'}
        onChange={e => setForm(f => ({ ...f, neutered: e.target.value === 'true' }))}>
        <option value="false">No</option>
        <option value="true">Sí</option>
      </select>
    </label>

    <label className="pf-pet-label">Notas personales
      <textarea className="pf-pet-input pf-pet-textarea"
        placeholder="Alergias, comportamiento, preferencias..."
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
    </label>

    <div className="pf-pet-actions">
      <button
        onClick={() => { setEditing(false); setSaveError(null) }}
        className="pf-pet-cancel" disabled={saving}>
        Cancelar
      </button>
      <button onClick={handleSave} className="pf-pet-save" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  </div>
)}
```

Añade este CSS al bloque `<style>` existente del componente:

```css
.pf-pet-edit-btn {
  padding: 8px 16px; border-radius: 10px;
  border: 1px solid var(--pf-border); background: var(--pf-surface);
  font-family: var(--pf-font-body); font-size: 13px; font-weight: 600;
  color: var(--pf-ink); cursor: pointer; transition: background .15s;
}
.pf-pet-edit-btn:hover { background: var(--pf-coral-soft); color: var(--pf-coral); }

.pf-pet-form {
  display: flex; flex-direction: column; gap: 14px; padding: 4px 0;
}
.pf-pet-form-title {
  font-family: var(--pf-font-display); font-size: 17px;
  font-weight: 700; color: var(--pf-ink); margin: 0;
}
.pf-pet-label {
  display: flex; flex-direction: column; gap: 6px;
  font-family: var(--pf-font-body); font-size: 11px;
  font-weight: 700; color: var(--pf-muted);
  text-transform: uppercase; letter-spacing: .05em;
}
.pf-pet-input {
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--pf-border); background: var(--pf-surface);
  font-family: var(--pf-font-body); font-size: 14px; color: var(--pf-ink);
  outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
}
.pf-pet-input:focus { border-color: var(--pf-coral); }
.pf-pet-textarea { min-height: 80px; resize: vertical; }

.pf-pet-actions {
  display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px;
}
.pf-pet-cancel {
  padding: 10px 18px; border-radius: 10px;
  border: 1px solid var(--pf-border); background: transparent;
  font-family: var(--pf-font-body); font-size: 14px;
  font-weight: 600; color: var(--pf-muted); cursor: pointer;
}
.pf-pet-save {
  padding: 10px 18px; border-radius: 10px; border: none;
  background: var(--pf-coral); color: #fff;
  font-family: var(--pf-font-body); font-size: 14px;
  font-weight: 700; cursor: pointer; transition: background .15s;
}
.pf-pet-save:hover:not(:disabled) { background: var(--pf-coral-dark); }
.pf-pet-save:disabled,
.pf-pet-cancel:disabled { opacity: .6; cursor: not-allowed; }
```

```bash
npx tsc --noEmit
```
Commit: `feat: editable pet profile in Ficha tab`

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

**Checklist de prueba manual:**

1. Login como owner → llega a `/owner/dashboard` (dashboard con widgets: Hola Wilmer)
2. Nav desktop sidebar: Inicio | Marketplace | Mis citas | Perfil
3. Nav mobile: Inicio | Marketplace | [FAB] | Mis citas | Perfil
4. Clic nav "Inicio" → `/owner/dashboard` (dashboard con widgets)
5. Clic nav "Perfil" → `/owner/settings` (nombre, email, teléfono, seguridad)
6. Ir a `/owner/perfil` → redirect automático a `/owner/dashboard`
7. Ir a `/owner/profile` → redirect automático a `/owner/settings`
8. Logo de Petfhans en sidebar → lleva a `/owner/dashboard`
9. `/owner/inicio` y `/owner/home` → 404 o página en blanco (libres, sin tocar)
10. Perfil de kitty → tab Ficha → botón "Editar perfil"
11. Llenar raza "Siamés", peso 3.5 kg → Guardar → datos actualizados
12. Recargar → datos persisten en la BD

PR: `fix: /dashboard=widgets, /settings=cuenta, liberar /inicio para landing, editable pet profile`

---

## Restricciones

- ❌ NO crear ni modificar `/owner/inicio` ni `/owner/home` — libres para landing
- ❌ No toques `src/app/vet/` ni `src/app/admin/`
- ❌ No modifiques migraciones de Supabase
- ❌ No instales dependencias nuevas
- ✅ Un commit por tarea
- ✅ `npx tsc --noEmit` después de cada cambio
