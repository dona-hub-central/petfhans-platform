# Prompt — Restructura de navegación y perfil owner

Lee **CLAUDE.md** antes de empezar.

Luego lee:
```
skills-ai/incremental-implementation/SKILL.md
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
```

---

## Contexto — qué cambiar y por qué

El PR #46 entregó el dashboard de widgets en `/owner/perfil`, pero la
navegación quedó mal configurada. La situación actual es:

| Nav item | Apunta a | Debería apuntar a |
|----------|----------|-------------------|
| Inicio | `/owner/perfil` (dashboard) | Libre para landing page |
| Perfil | `/owner/profile` (settings) | `/owner/perfil` (dashboard) |
| Mensajes | `/owner/messages` | **Eliminar** — ya está en Acciones Rápidas |

Adicionalmente, la settings page de cuenta debe moverse de
`/owner/profile` → `/owner/settings`.

Por último, el perfil de mascota muestra los campos en modo lectura
con `—` donde faltan datos. El dueño no tiene forma de completarlos.

---

## TAREA 1 — Mover settings de cuenta: `/owner/profile` → `/owner/settings`

### 1A — Crear `/owner/settings/page.tsx`

Lee `src/app/owner/profile/page.tsx` completo.

Crea `src/app/owner/settings/page.tsx` con el mismo contenido exacto.
No cambies nada del contenido — solo lo mueves de ruta.

### 1B — Convertir `/owner/profile` en redirect

Reemplaza el contenido de `src/app/owner/profile/page.tsx` por:

```typescript
import { redirect } from 'next/navigation'
export default function ProfileRedirect() {
  redirect('/owner/settings')
}
```

Esto preserva links existentes que apunten a `/owner/profile`.

```bash
npx tsc --noEmit
```
Commit: `refactor: move owner profile settings to /owner/settings`

---

## TAREA 2 — Reestructurar la navegación del owner

Lee `src/components/owner/OwnerBottomNav.tsx` completo.

### Nuevo array de items de navegación

El array `items` debe quedar así — **4 items, sin Mensajes, sin Inicio**:

```typescript
const items = [
  { href: '/marketplace/clinicas', Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',   Icon: Calendar,  label: 'Mis citas',   match: '/owner/appointments' },
  { href: '/owner/perfil',         Icon: User,      label: 'Perfil',      match: '/owner/perfil' },
] as const
```

**Quitar de imports:** `Home`, `MessageSquare` (ya no se usan)
**Mantener imports:** `Store`, `Calendar`, `User`, `Plus`, `PawPrint`

### Mobile bottom bar — nueva estructura

Con 3 items + FAB central, el grid pasa de 6 a 5 columnas:

```typescript
// Mobile bot-inner: grid de 5 columnas (item, item, FAB, item, item)
// Antes era: 1fr 1fr 1.2fr 1fr 1fr 1fr
// Ahora:     1fr 1fr 1.2fr 1fr 1fr
```

En el JSX del mobile:
```tsx
{/* Solo los primeros 1 item antes del FAB */}
{items.slice(0, 1).map(...)}

<Link href="/owner/appointments/new" className="pf-own-fab" ...>
  ...
</Link>

{/* Los 2 items restantes después del FAB */}
{items.slice(1).map(...)}
```

Así la distribución en mobile queda:
`Marketplace | [FAB Pedir cita] | Mis citas | Perfil`

### Desktop sidebar — quitar Mensajes, ajustar Perfil

El sidebar usa el mismo array `items` en un `.map()`, así que al
eliminar Mensajes del array ya no aparece. Solo verifica que
el sidebar siga renderizando correctamente con 3 items.

### Actualizar el CSS del grid mobile

Busca la regla `.pf-own-bot-inner` y cambia el grid:
```css
/* Antes */
grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr 1fr;

/* Después */
grid-template-columns: 1fr 1.2fr 1fr 1fr;
```

```bash
npx tsc --noEmit
```
Commit: `fix: remove Mensajes from nav, make Perfil point to dashboard, remove Inicio`

---

## TAREA 3 — Actualizar todos los links internos que apunten a `/owner/profile`

```bash
grep -rn "owner/profile" src/ --include="*.tsx" --include="*.ts"
```

Para cada ocurrencia que NO sea el redirect que creamos en TAREA 1:
- Reemplaza `/owner/profile` por `/owner/settings`

Casos probables: links en el dashboard, en PetSummaryWidget, en GreetingHeader.

```bash
npx tsc --noEmit
```
Commit: `fix: update all internal links from /owner/profile to /owner/settings`

---

## TAREA 4 — Liberar la ruta `/owner/perfil` de la etiqueta "Inicio"

Lee `src/app/owner/perfil/page.tsx`.

El título de la página y cualquier referencia a "Inicio" dentro de este
archivo debe cambiarse a "Mi perfil" o eliminarse. El metadata title
debe reflejar esto:

```typescript
export const metadata = { title: 'Mi perfil · Petfhans' }
// Ya está correcto — solo verificar que no haya h1 o breadcrumb que diga "Inicio"
```

Lee `src/app/page.tsx` (raíz) — verifica que para `pet_owner` redirija
a `/owner/perfil`. Esto está correcto y se mantiene por ahora ya que
aún no hay landing page. Cuando la landing exista, este redirect se
eliminará.

```bash
npx tsc --noEmit
```
Commit: `fix: cleanup perfil page — remove Inicio references`

---

## TAREA 5 — Perfil de mascota editable

Actualmente la ficha de kitty muestra `Raza —`, `Edad —`, `Peso —`,
`Microchip —` porque esos campos no se llenaron al crear la mascota.
El dueño no tiene forma de editarlos desde el portal.

### 5A — API route PATCH `/api/owner/pets/[id]`

Lee `src/app/api/owner/pets/` para ver qué routes existen.

Si no existe un PATCH para actualizar el perfil de una mascota desde
el portal owner, créalo en `src/app/api/owner/pets/[id]/route.ts`:

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

  // Verificar ownership: el owner debe tener acceso a esta mascota
  const { data: pet } = await admin
    .from('pets').select('id, owner_id').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  if (profile.role === 'pet_owner' && pet.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Sin permiso sobre esta mascota' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { error } = await admin
    .from('pets').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', petId)

  if (error) {
    console.error('[owner/pets/[id] PATCH]', error)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

```bash
npx tsc --noEmit
```
Commit: `feat: add PATCH /api/owner/pets/[id] for owner pet profile editing`

---

### 5B — UI editable en la pestaña Ficha

Lee `src/components/owner/OwnerPetView.tsx` completo.

La pestaña `info` (Ficha) actualmente muestra los datos en modo lectura.
Necesita un modo edición que se activa con un botón "Editar" y muestra
formulario inline.

**Campos editables por el dueño:**
- Nombre (`name`)
- Raza (`breed`) — input texto
- Fecha de nacimiento (`birth_date`) — input date
- Peso (`weight`) — input número con paso 0.1
- Sexo (`gender`) — select: Macho / Hembra / No especificado
- Castrado/a (`neutered`) — toggle o select: Sí / No
- Microchip (`microchip`) — input texto
- Notas personales (`notes`) — textarea

**Patrón de implementación:**

```tsx
// Dentro de OwnerPetView, en el tab 'info':
const [editing, setEditing] = useState(false)
const [saving,  setSaving]  = useState(false)
const [form, setForm] = useState({
  name:       pet.name,
  breed:      pet.breed ?? '',
  birth_date: pet.birth_date ?? '',
  weight:     pet.weight?.toString() ?? '',
  gender:     pet.gender ?? '',
  neutered:   pet.neutered ?? false,
  microchip:  pet.microchip ?? '',
  notes:      pet.notes ?? '',
})

async function handleSave() {
  setSaving(true)
  const res = await fetch(`/api/owner/pets/${pet.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...form,
      weight: form.weight ? parseFloat(form.weight) : null,
      breed:      form.breed      || null,
      birth_date: form.birth_date || null,
      gender:     form.gender     || null,
      microchip:  form.microchip  || null,
      notes:      form.notes      || null,
    }),
  })
  setSaving(false)
  if (res.ok) {
    setEditing(false)
    router.refresh() // refresca los datos del Server Component
  }
}
```

**Vista de la Ficha en modo lectura** — añade botón Editar:
```tsx
{tab === 'info' && (
  <div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button onClick={() => setEditing(true)} className="pf-btn-edit">
        Editar perfil
      </button>
    </div>
    {/* tabla de datos existente */}
  </div>
)}
```

**Vista de la Ficha en modo edición** — formulario inline:
```tsx
{editing && (
  <div className="pf-edit-form">
    <p className="pf-edit-form-title">Editar perfil de {pet.name}</p>

    {/* Nombre */}
    <label className="pf-edit-label">Nombre
      <input className="pf-edit-input" value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
    </label>

    {/* Raza */}
    <label className="pf-edit-label">Raza
      <input className="pf-edit-input" placeholder="Ej: Siamés"
        value={form.breed}
        onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} />
    </label>

    {/* Fecha de nacimiento */}
    <label className="pf-edit-label">Fecha de nacimiento
      <input type="date" className="pf-edit-input"
        value={form.birth_date}
        onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
    </label>

    {/* Peso */}
    <label className="pf-edit-label">Peso (kg)
      <input type="number" step="0.1" min="0" max="999"
        className="pf-edit-input" placeholder="Ej: 4.5"
        value={form.weight}
        onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
    </label>

    {/* Sexo */}
    <label className="pf-edit-label">Sexo
      <select className="pf-edit-input" value={form.gender}
        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
        <option value="">No especificado</option>
        <option value="male">Macho</option>
        <option value="female">Hembra</option>
      </select>
    </label>

    {/* Castrado */}
    <label className="pf-edit-label">Castrado/a
      <select className="pf-edit-input"
        value={form.neutered ? 'true' : 'false'}
        onChange={e => setForm(f => ({ ...f, neutered: e.target.value === 'true' }))}>
        <option value="false">No</option>
        <option value="true">Sí</option>
      </select>
    </label>

    {/* Microchip */}
    <label className="pf-edit-label">Microchip
      <input className="pf-edit-input" placeholder="Número de microchip"
        value={form.microchip}
        onChange={e => setForm(f => ({ ...f, microchip: e.target.value }))} />
    </label>

    {/* Notas */}
    <label className="pf-edit-label">Notas personales
      <textarea className="pf-edit-input pf-edit-textarea"
        placeholder="Alergias, comportamiento, preferencias..."
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
    </label>

    <div className="pf-edit-actions">
      <button onClick={() => setEditing(false)} className="pf-edit-cancel"
        disabled={saving}>Cancelar</button>
      <button onClick={handleSave} className="pf-edit-save"
        disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  </div>
)}
```

**CSS del formulario de edición** — añadir al bloque `<style>` existente:
```css
.pf-btn-edit {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--pf-border);
  background: var(--pf-surface);
  font-family: var(--pf-font-body);
  font-size: 13px; font-weight: 600;
  color: var(--pf-ink);
  cursor: pointer;
  transition: background .15s;
}
.pf-btn-edit:hover { background: var(--pf-coral-soft); color: var(--pf-coral); }

.pf-edit-form {
  display: flex; flex-direction: column; gap: 14px;
  padding: 4px 0;
}
.pf-edit-form-title {
  font-family: var(--pf-font-display);
  font-size: 17px; font-weight: 700; color: var(--pf-ink);
  margin: 0 0 4px;
}
.pf-edit-label {
  display: flex; flex-direction: column; gap: 6px;
  font-family: var(--pf-font-body);
  font-size: 12px; font-weight: 700; color: var(--pf-muted);
  text-transform: uppercase; letter-spacing: .05em;
}
.pf-edit-input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--pf-border);
  background: var(--pf-surface);
  font-family: var(--pf-font-body);
  font-size: 14px; color: var(--pf-ink);
  outline: none;
  transition: border-color .15s;
}
.pf-edit-input:focus { border-color: var(--pf-coral); }
.pf-edit-textarea { min-height: 80px; resize: vertical; }
.pf-edit-actions {
  display: flex; gap: 10px; justify-content: flex-end;
  padding-top: 4px;
}
.pf-edit-cancel {
  padding: 10px 18px; border-radius: 10px;
  border: 1px solid var(--pf-border);
  background: transparent;
  font-family: var(--pf-font-body);
  font-size: 14px; font-weight: 600; color: var(--pf-muted);
  cursor: pointer;
}
.pf-edit-save {
  padding: 10px 18px; border-radius: 10px;
  background: var(--pf-coral); color: #fff; border: none;
  font-family: var(--pf-font-body);
  font-size: 14px; font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.pf-edit-save:hover:not(:disabled) { background: var(--pf-coral-dark); }
.pf-edit-save:disabled, .pf-edit-cancel:disabled { opacity: .6; cursor: not-allowed; }
```

**Nota:** `OwnerPetView` ya es un Client Component (`'use client'`), así que
`useState`, `useRouter` y `fetch` ya están disponibles. Si falta importar
`useRouter`, añádelo desde `next/navigation`.

```bash
npx tsc --noEmit
```
Commit: `feat: make pet profile editable from owner portal (Ficha tab)`

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

**Prueba manual — checklist:**

1. Nav desktop sidebar: debe mostrar **Marketplace, Mis citas, Perfil** — sin Inicio, sin Mensajes
2. Nav mobile: debe mostrar **Marketplace | [FAB] | Mis citas | Perfil** — 4 columnas
3. Clic en "Perfil" (nav) → lleva a `/owner/perfil` con el dashboard de widgets
4. Ir a `/owner/settings` → muestra el formulario de datos personales (nombre, email, teléfono, contraseña)
5. Ir a `/owner/profile` → redirige automáticamente a `/owner/settings`
6. Dashboard widgets: el botón de mensajes sigue en Acciones Rápidas ✅
7. Entrar al perfil de kitty → pestaña Ficha → aparece botón "Editar perfil"
8. Clic en Editar → aparece el formulario inline con todos los campos
9. Llenar Raza: "Siamés", Peso: 3.5, guardar → los datos se actualizan sin recargar la página manualmente
10. Recargar la página → los datos guardados persisten

PR: `fix: nav restructure — Perfil=dashboard, settings→/settings, editable pet profile`

---

## Restricciones

- ❌ No toques `src/app/vet/` ni `src/app/admin/`
- ❌ No modifiques migraciones de Supabase
- ❌ No instales dependencias nuevas
- ✅ Un commit por tarea
- ✅ `npx tsc --noEmit` después de cada cambio
- ✅ Usa variables `--pf-*` para todos los estilos
