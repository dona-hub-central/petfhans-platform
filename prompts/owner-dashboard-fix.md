# Prompt — Fix de URLs y perfil editable del portal owner

Lee **CLAUDE.md** antes de empezar.

---

## Mapa definitivo de URLs

| URL actual | URL nueva | Contenido | En nav |
|------------|-----------|-----------|--------|
| `/owner/perfil` | `/owner/dashboard` | Dashboard con widgets (Hola Wilmer) | "Perfil" |
| `/owner/profile` | `/owner/settings` | Cuenta (nombre, email, tel) + Seguridad | No (icono ⚙ en dashboard) |
| `/owner/inicio` | **LIBRE** | Futura landing page — NO TOCAR | — |
| `/owner/home` | **LIBRE** | Futura landing page — NO TOCAR | — |

Nav después de los cambios — **3 items, sin Inicio, sin Mensajes**:
```
Marketplace → /marketplace/clinicas
Mis citas   → /owner/appointments
Perfil      → /owner/dashboard    ← el dashboard con widgets
```

`/owner/settings` NO es un nav item — se accede desde un icono ⚙
dentro del dashboard (widget de saludo, esquina superior derecha).

---

## TAREA 1 — Renombrar `/owner/perfil` → `/owner/dashboard`

Lee antes de empezar:
```
skills-ai/incremental-implementation/SKILL.md
```

### 1A — Promover el contenido a `/owner/dashboard`

El archivo `src/app/owner/dashboard/page.tsx` existe actualmente como
un redirect a `/owner/perfil`. Reemplaza ese redirect con el contenido
completo de `src/app/owner/perfil/page.tsx`.

Lee `src/app/owner/perfil/page.tsx` primero, luego sobreescribe
`src/app/owner/dashboard/page.tsx` con ese contenido exacto.

Actualiza el metadata:
```typescript
export const metadata = { title: 'Mi perfil · Petfhans' }
```

### 1B — Convertir `/owner/perfil` en redirect de compatibilidad

```typescript
// src/app/owner/perfil/page.tsx
import { redirect } from 'next/navigation'
export default function PerfilLegacyRedirect() {
  redirect('/owner/dashboard')
}
```

### 1C — Actualizar redirecciones post-login

```bash
grep -rn "owner/perfil" src/ --include="*.ts" --include="*.tsx"
```

Reemplaza `/owner/perfil` por `/owner/dashboard` en cada resultado,
EXCEPTO en `src/app/owner/perfil/page.tsx` (que ya es el redirect).

Archivos esperados: `src/app/page.tsx`, `src/app/auth/login/page.tsx`,
`src/app/auth/callback/route.ts`, `src/app/auth/invite/page.tsx`.

```bash
npx tsc --noEmit
```
Commit: `refactor: move dashboard from /owner/perfil to /owner/dashboard`

---

## TAREA 2 — Renombrar `/owner/profile` → `/owner/settings`

Lee antes de empezar:
```
skills-ai/coding-best-practices/SKILL.md
```

### 2A — Crear `/owner/settings/page.tsx`

Lee `src/app/owner/profile/page.tsx` completo.

Crea `src/app/owner/settings/page.tsx` con el mismo contenido.
Si la página original tenía solo datos personales sin sección de
seguridad, organiza el contenido en dos secciones dentro de la
misma página:
1. **Datos personales** — nombre, email, teléfono
2. **Seguridad** — cambio de contraseña

Actualiza el metadata:
```typescript
export const metadata = { title: 'Mi cuenta · Petfhans' }
```

### 2B — Convertir `/owner/profile` en redirect de compatibilidad

```typescript
// src/app/owner/profile/page.tsx
import { redirect } from 'next/navigation'
export default function ProfileLegacyRedirect() {
  redirect('/owner/settings')
}
```

### 2C — Actualizar referencias internas

```bash
grep -rn "owner/profile" src/ --include="*.ts" --include="*.tsx"
```

Reemplaza `/owner/profile` por `/owner/settings` en cada resultado,
EXCEPTO en `src/app/owner/profile/page.tsx` (ya es redirect).

### 2D — Añadir icono ⚙ de acceso a settings desde el dashboard

En `src/components/owner/dashboard/GreetingHeader.tsx`, añade el link
al lado derecho del saludo:

```tsx
import { Settings } from 'lucide-react'
import Link from 'next/link'

// En el header, a la derecha del nombre:
<Link href="/owner/settings" style={{
  display: 'inline-flex', alignItems: 'center',
  color: 'var(--pf-muted)', textDecoration: 'none',
}} aria-label="Configuración de cuenta">
  <Settings size={18} strokeWidth={1.75} />
</Link>
```

```bash
npx tsc --noEmit
```
Commit: `refactor: move account settings from /owner/profile to /owner/settings`

---

## TAREA 3 — Actualizar la navegación

Lee antes de empezar:
```
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
```

Lee `src/components/owner/OwnerBottomNav.tsx` completo.

### Nuevo array `items` — 3 items, sin Inicio, sin Mensajes

```typescript
import { Store, Calendar, User, Plus, PawPrint } from 'lucide-react'
// Eliminar del import: Home, MessageSquare

const items = [
  { href: '/marketplace/clinicas', Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',   Icon: Calendar, label: 'Mis citas',   match: '/owner/appointments' },
  { href: '/owner/dashboard',      Icon: User,     label: 'Perfil',      match: '/owner/dashboard' },
] as const
```

**Por qué:**
- "Inicio" eliminado — quedará libre para la futura landing page
- "Mensajes" eliminado — ya está en el widget de Acciones Rápidas
- "Perfil" → `/owner/dashboard` (el dashboard de widgets es el perfil del owner)
- `/owner/settings` no es nav item — se accede desde el icono ⚙

### Grid mobile — 3 items + FAB = 4 columnas

Busca `.pf-own-bot-inner` y cambia el grid:
```css
/* Antes (6 columnas): */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr 1fr;

/* Después (4 columnas): */
grid-template-columns: 1fr 1.2fr 1fr 1fr;
```

### Distribución mobile — 1 item | FAB | 2 items

```tsx
{items.slice(0, 1).map(item => (
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

{items.slice(1).map(item => (
  <BottomLink key={item.href} item={item}
    active={path.startsWith(item.match) && !fabActive} />
))}
```

Resultado mobile: `Marketplace | [FAB] | Mis citas | Perfil`

### Sidebar desktop — logo como link al dashboard

```tsx
<Link href="/owner/dashboard" className="pf-own-side-brand"
  style={{ textDecoration: 'none' }}>
  <span className="pf-own-side-logo">
    <PawPrint size={18} strokeWidth={2.25} />
  </span>
  <span className="pf-own-side-name">Petfhans</span>
</Link>
```

```bash
npx tsc --noEmit
```
Commit: `fix: nav — Perfil→/dashboard, remove Inicio and Mensajes`

---

## TAREA 4 — Perfil de mascota editable (tab Ficha)

Lee antes de empezar:
```
skills-ai/api-and-interface-design/SKILL.md
skills-ai/security-and-hardening/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
```

Actualmente la ficha de kitty muestra `Raza —`, `Peso —`, `Edad —`,
`Microchip —` y el dueño no puede editarlos.

### 4A — API route PATCH `/api/owner/pets/[id]`

Verifica si ya existe:
```bash
ls src/app/api/owner/pets/[id]/route.ts 2>/dev/null || echo "no existe"
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
  const { data: pet } = await admin
    .from('pets').select('id, owner_id').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  // Ownership check — pet_owner solo puede editar sus propias mascotas
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

### 4B — Formulario editable en OwnerPetView (tab Ficha)

Lee `src/components/owner/OwnerPetView.tsx` completo.
Verifica el nombre exacto del tab de ficha (puede ser `'info'`, `'ficha'` u otro).

Este componente ya es `'use client'`. Añade al inicio del componente
(antes del `return`):

```typescript
import { useRouter } from 'next/navigation' // añadir si no está

const router = useRouter()
const [editing, setEditing]     = useState(false)
const [saving, setSaving]       = useState(false)
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

En el tab de ficha, reemplaza el contenido actual por:

```tsx
{/* MODO LECTURA */}
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

{/* MODO EDICIÓN */}
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
      <button onClick={() => { setEditing(false); setSaveError(null) }}
        className="pf-pet-cancel" disabled={saving}>Cancelar</button>
      <button onClick={handleSave} className="pf-pet-save" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  </div>
)}
```

Añade al bloque `<style>` del componente:

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

Lee antes de empezar:
```
skills-ai/browser-testing-with-devtools/SKILL.md
```

```bash
npx tsc --noEmit
npm run build
```

Con la app corriendo en localhost, prueba con la cuenta de Wilmer
(wilmerjoselynchestaba@gmail.com):

| Requisito original | Verificación |
|--------------------|-------------|
| "inicio quedara libre para landing" | `/owner/inicio` y `/owner/home` → 404, no existen |
| "dashboard pasa a Perfil" | Nav "Perfil" → `/owner/dashboard` (widgets, Hola Wilmer) |
| "lo de Perfil pasa a /settings" | `/owner/settings` muestra nombre, email, tel, contraseña |
| "quitar Mensajes del nav" | Nav mobile y sidebar no tienen "Mensajes" |
| "perfil de mascota editable" | Tab Ficha → botón "Editar perfil" → formulario funcional |

**Prueba paso a paso:**

1. Login → llega a `/owner/dashboard` (Hola Wilmer, widgets) ✅
2. Nav mobile: `Marketplace | [FAB] | Mis citas | Perfil` — 4 columnas ✅
3. Nav desktop sidebar: `Marketplace | Mis citas | Perfil` — sin Inicio, sin Mensajes ✅
4. Clic nav "Perfil" → `/owner/dashboard` (dashboard con widgets, NO settings) ✅
5. Icono ⚙ en el dashboard → `/owner/settings` ✅
6. `/owner/settings` muestra datos personales + cambio de contraseña ✅
7. `/owner/perfil` → redirect automático a `/owner/dashboard` ✅
8. `/owner/profile` → redirect automático a `/owner/settings` ✅
9. Logo sidebar → lleva a `/owner/dashboard` ✅
10. Kitty → tab Ficha → botón "Editar perfil" visible ✅
11. Editar raza "Siamés", peso 3.5 → Guardar → datos actualizados en pantalla ✅
12. Recargar → datos persisten desde la BD ✅

PR: `fix: Perfil=dashboard /settings=cuenta landing-libre editable-pet-profile`

---

## Restricciones

- ❌ NO crear ni tocar `/owner/inicio` ni `/owner/home` — libres para landing
- ❌ "Inicio" NO debe aparecer en la nav (ni mobile ni desktop)
- ❌ "Mensajes" NO debe aparecer en la nav
- ❌ No toques `src/app/vet/` ni `src/app/admin/`
- ❌ No modifiques migraciones de Supabase
- ❌ No instales dependencias nuevas
- ✅ Un commit por tarea
- ✅ `npx tsc --noEmit` después de cada cambio
- ✅ Variables `--pf-*` para todos los estilos
