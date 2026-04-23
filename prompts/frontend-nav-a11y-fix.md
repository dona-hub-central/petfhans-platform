# Prompt para Claude Code — Correcciones de Navegación y Accesibilidad

> **Regla de oro:** Antes de modificar cualquier archivo, léelo completo con `cat` o `Read`. Si no encuentras el archivo exactamente donde este prompt dice que está, detente y avisa en lugar de inventar su contenido. Nunca asumas el contenido de un archivo — siempre verifícalo primero.

---

## Contexto del proyecto

Lee estos archivos antes de empezar. No son opcionales:

```bash
cat PRODUCT.md                              # visión del producto y rutas
cat DESIGN_SYSTEM.md                        # tokens de diseño y componentes
cat src/app/layout.tsx                      # root layout
cat src/components/shared/VetLayout.tsx     # sidebar veterinaria
cat src/components/admin/AdminLayout.tsx    # sidebar admin
cat src/components/owner/OwnerPetView.tsx   # portal dueño
cat src/app/vet/dashboard/page.tsx          # cómo usa VetLayout actualmente
cat src/middleware.ts                       # guards de autenticación
```

Verifica que estas rutas existen antes de empezar:

```bash
ls src/app/vet/
ls src/app/admin/
ls src/app/owner/
ls src/components/shared/
ls src/components/admin/
```

---

## Arquitectura actual (lo que encontrarás)

Cada página del panel vet importa `VetLayout` manualmente:

```tsx
// src/app/vet/dashboard/page.tsx — patrón actual en TODAS las páginas vet
import VetLayout from '@/components/shared/VetLayout'
export default async function Page() {
  // ... fetch data ...
  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      {/* contenido */}
    </VetLayout>
  )
}
```

Esto significa que el sidebar se destruye y reconstruye en cada navegación. El objetivo de las primeras tareas es corregir esto usando el sistema de layouts de Next.js App Router.

---

## FASE 1 — Correcciones críticas

### TAREA 1.1 — Crear `src/app/vet/layout.tsx`

Este archivo hará que el sidebar persista entre páginas. Sigue estos pasos **en orden**:

**Paso 1:** Lee `src/app/vet/dashboard/page.tsx` completo para entender exactamente qué props recibe `VetLayout` (`clinicName` y `userName`) y cómo se obtienen de Supabase.

**Paso 2:** Lee `src/components/shared/VetLayout.tsx` completo para confirmar la firma de props.

**Paso 3:** Crea `src/app/vet/layout.tsx` con este patrón exacto:

```tsx
// src/app/vet/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'

export default async function VetSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, clinics(name)')
    .eq('user_id', user.id)
    .single()

  const clinicName = (profile as any)?.clinics?.name ?? ''
  const userName = profile?.full_name ?? ''

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      {children}
    </VetLayout>
  )
}
```

**Paso 4:** Una vez creado `src/app/vet/layout.tsx`, actualiza CADA página de `/vet/*` para:
- Eliminar el `import VetLayout from '@/components/shared/VetLayout'`
- Eliminar el `<VetLayout>` wrapper del return
- Eliminar el fetch de `profile?.clinics?.name` y `profile?.full_name` si ya no se usan en esa página (pueden quedar si se usan para otra cosa)
- Mantener toda la lógica de negocio intacta

Las páginas a actualizar son exactamente estas (verifica que existan antes de tocarlas):
```bash
ls src/app/vet/dashboard/
ls src/app/vet/pets/
ls src/app/vet/records/
ls src/app/vet/appointments/
ls src/app/vet/invitations/
ls src/app/vet/team/
ls src/app/vet/ai/
ls src/app/vet/billing/
ls src/app/vet/profile/
```

**Regla:** Si una página tiene su propia query de auth (`supabase.auth.getUser()`) por otras razones (obtener `clinic_id` para queries), mantenla. Solo elimina el wrapper de `VetLayout`.

### TAREA 1.2 — Crear `src/app/admin/layout.tsx`

Mismo patrón que 1.1 pero para el panel admin. Lee primero:

```bash
cat src/components/admin/AdminLayout.tsx
cat src/app/admin/page.tsx
```

Confrima la firma de props de `AdminLayout` (espera `userName: string`). Crea el layout y actualiza cada página bajo `/admin/*`.

### TAREA 1.3 — Fix de seguridad en middleware

**Paso 1:** Lee el middleware completo:
```bash
cat src/middleware.ts
```

**Paso 2:** Localiza la condición que usa `subdomain === ''`. Debe estar en el bloque de rutas públicas. El problema es que cuando `subdomain` es string vacío, el middleware retorna sin validar autenticación.

**Paso 3:** Asegúrate de que el guard quede así (ajusta a la lógica real que encuentres):

```typescript
// Si no hay subdominio Y la ruta no es pública, redirigir a login o a la página principal
if (subdomain === '' && !publicPaths.some(p => path.startsWith(p))) {
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
```

**Regla:** No reescribas el middleware entero. Modifica solo la condición del subdominio vacío. Preserva toda la lógica existente.

### TAREA 1.4 — Fix viewport en root layout

**Paso 1:** Lee `src/app/layout.tsx`.

**Paso 2:** Localiza el objeto `viewport`. Tiene `maximumScale: 1` que bloquea el zoom de accesibilidad en iOS.

**Paso 3:** Elimina solo esa línea:

```typescript
// ANTES
export const viewport: Viewport = {
  themeColor: '#EE726D',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,  // ← eliminar esta línea
}

// DESPUÉS
export const viewport: Viewport = {
  themeColor: '#EE726D',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}
```

### TAREA 1.5 — Fix `<a>` → `<Link>` en OwnerPetView

**Paso 1:** Lee `src/components/owner/OwnerPetView.tsx`.

**Paso 2:** Busca el anchor `<a href="/owner/dashboard"`. Está en el área del hero.

**Paso 3:** Reemplázalo por `<Link href="/owner/dashboard">`. Verifica que `Link` ya está importado de `next/link` en ese archivo. Si no, añade el import.

**Regla:** Solo cambia ese enlace específico. No toques ninguna otra lógica del componente.

---

## FASE 2 — Quick wins de accesibilidad

Esta fase no modifica lógica de negocio. Solo añade atributos HTML.

### TAREA 2.1 — ARIA en VetLayout sidebar

**Paso 1:** Lee `src/components/shared/VetLayout.tsx`.

**Paso 2:** Aplica estos cambios (busca los elementos exactos antes de modificar):

a) Al elemento `<aside>`, añade `aria-label="Barra lateral de navegación"`

b) Al elemento `<nav>`, añade `aria-label="Navegación principal"`

c) En cada `<Link>` del sidebar que mapea `nav.map(item => ...)`, añade:
```tsx
aria-current={active ? 'page' : undefined}
```

d) Al avatar del usuario en la sección inferior (el `<div>` con la inicial del nombre), añade:
```tsx
aria-label={`Perfil de ${userName}`}
```

e) Al botón de logout (si existe), añade `aria-label="Cerrar sesión"`

### TAREA 2.2 — ARIA en AdminLayout sidebar

Mismo proceso que 2.1 pero en `src/components/admin/AdminLayout.tsx`. Lee el archivo primero y aplica los mismos patrones.

### TAREA 2.3 — ARIA en tabs de OwnerPetView

**Paso 1:** Lee `src/components/owner/OwnerPetView.tsx` y localiza el bloque de tabs (el `div` con `className="mob-tabs"` y los botones de tabs).

**Paso 2:** Aplica el patrón ARIA de tabs:

```tsx
// Contenedor de tabs
<div className="mob-tabs" role="tablist" aria-label="Secciones de la mascota">
  {TABS.map(({ key, Icon, label }) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`mob-tab${tab === key ? ' active' : ''}`}
      role="tab"
      aria-selected={tab === key}
      aria-controls={`tab-panel-${key}`}
      id={`tab-${key}`}
    >
      <Icon size={17} strokeWidth={2} />{label}
    </button>
  ))}
</div>

// En el área de contenido, al div que envuelve el contenido del tab activo:
// Añade id, role y aria-labelledby al panel de contenido visible
// Ejemplo para el panel de info:
<div
  role="tabpanel"
  id="tab-panel-info"
  aria-labelledby="tab-info"
  hidden={tab !== 'info'}
>
  ...
</div>
```

**Regla:** Mantén la lógica de visibilidad exactamente igual a como está. Solo añade los atributos ARIA. No cambies el CSS ni los nombres de clase.

### TAREA 2.4 — Skip-to-content en root layout

**Paso 1:** Lee `src/app/layout.tsx`.

**Paso 2:** Añade un enlace de skip al inicio del `<body>`, ANTES de `{children}`:

```tsx
<body className="min-h-full flex flex-col antialiased">
  <a
    href="#main-content"
    style={{
      position: 'absolute',
      left: '-9999px',
      top: 'auto',
      width: 1,
      height: 1,
      overflow: 'hidden',
    }}
    onFocus={(e) => {
      e.currentTarget.style.left = '50%'
      e.currentTarget.style.transform = 'translateX(-50%)'
      e.currentTarget.style.width = 'auto'
      e.currentTarget.style.height = 'auto'
      e.currentTarget.style.overflow = 'visible'
      e.currentTarget.style.zIndex = '9999'
      e.currentTarget.style.top = '8px'
      e.currentTarget.style.padding = '8px 16px'
      e.currentTarget.style.background = '#EE726D'
      e.currentTarget.style.color = '#fff'
      e.currentTarget.style.borderRadius = '8px'
      e.currentTarget.style.textDecoration = 'none'
    }}
    onBlur={(e) => {
      e.currentTarget.style.left = '-9999px'
      e.currentTarget.style.transform = ''
    }}
  >
    Saltar al contenido principal
  </a>
  {children}
</body>
```

**Paso 3:** En el area de contenido principal de `VetLayout` (el `<main>`), añade `id="main-content"`.

Haz lo mismo en `AdminLayout` y en el `<div className="scroll-area">` de `OwnerPetView`.

### TAREA 2.5 — ARIA en AvailabilityToggle (si existe)

**Paso 1:** Verifica si el archivo existe:
```bash
ls src/components/vet/AvailabilityToggle.tsx 2>/dev/null || echo "NO EXISTE"
```

**Paso 2:** Si existe, léelo. Busca el botón de toggle de disponibilidad y añade `aria-pressed={available}` donde `available` es el estado booleano actual.

**Si el archivo no existe, omite esta tarea completamente.**

---

## FASE 3 — Archivos de límite de segmento (loading, error, not-found)

### TAREA 3.1 — Loading states

Crea estos tres archivos. Son Server Components simples:

**`src/app/vet/loading.tsx`:**
```tsx
export default function VetLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--pf-bg)',
    }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--pf-coral)',
            animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
```

Crea el mismo archivo para `src/app/admin/loading.tsx` y `src/app/owner/loading.tsx` (con el mismo contenido).

### TAREA 3.2 — Error boundaries

**`src/app/vet/error.tsx`:**

```tsx
'use client'
import { useEffect } from 'react'

export default function VetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[VetError]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--pf-bg)',
      gap: 16,
      padding: 24,
    }}>
      <p style={{ fontSize: 32 }}>⚠️</p>
      <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 20, color: 'var(--pf-ink)', margin: 0 }}>
        Algo salió mal
      </h2>
      <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', textAlign: 'center', margin: 0 }}>
        Ocurrió un error inesperado. Intenta de nuevo o contacta a soporte si persiste.
      </p>
      <button
        onClick={reset}
        style={{
          background: 'var(--pf-coral)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 24px',
          fontFamily: 'var(--pf-font-body)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
```

Crea el mismo archivo para `src/app/admin/error.tsx` y `src/app/owner/error.tsx`.

### TAREA 3.3 — Not found global

**`src/app/not-found.tsx`:**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--pf-bg)',
      gap: 16,
      padding: 24,
    }}>
      <p style={{ fontSize: 48 }}>🐾</p>
      <h1 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 24, color: 'var(--pf-ink)', margin: 0 }}>
        Página no encontrada
      </h1>
      <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', textAlign: 'center', margin: 0 }}>
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        style={{
          background: 'var(--pf-coral)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 10,
          padding: '10px 24px',
          fontFamily: 'var(--pf-font-body)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Volver al inicio
      </Link>
    </div>
  )
}
```

---

## FASE 4 — Sidebar responsive (mobile)

> Esta es la tarea más compleja. Léela completa antes de empezar.

### TAREA 4.1 — VetLayout mobile-first

**Paso 1:** Lee `src/components/shared/VetLayout.tsx` completo.

**Paso 2:** El sidebar actual es `position: fixed; width: 220px` sin ninguna media query. En mobile ocupa más de la mitad de la pantalla.

**Paso 3:** Añade un estado para el menú móvil y las media queries necesarias:

```tsx
// Añadir al inicio del componente (es Client Component — ya tiene 'use client')
const [mobileOpen, setMobileOpen] = useState(false)

// En el <aside>, añadir clase condicional o style dinámico
// Añadir botón hamburguesa en mobile
// El sidebar en mobile debe ser: position: fixed, transform: translateX(-100%) cuando cerrado
// y transform: translateX(0) cuando abierto, con z-index: 50
// Un overlay oscuro al fondo cuando está abierto
```

**Implementación exacta a añadir:**

En el JSX, antes del `<aside>`, añade el botón hamburguesa que solo se ve en mobile:

```tsx
{/* Botón hamburguesa — solo visible en mobile */}
<button
  onClick={() => setMobileOpen(true)}
  aria-label="Abrir menú"
  aria-expanded={mobileOpen}
  style={{
    position: 'fixed',
    top: 14,
    left: 14,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'var(--pf-white)',
    border: '0.5px solid var(--pf-border)',
    display: 'none', // visible solo via media query
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }}
  className="pf-hamburger"
>
  <Menu size={20} style={{ color: 'var(--pf-ink)' }} />
</button>

{/* Overlay oscuro cuando sidebar está abierto en mobile */}
{mobileOpen && (
  <div
    onClick={() => setMobileOpen(false)}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 30,
    }}
    aria-hidden="true"
  />
)}
```

Al elemento `<aside>`, añade la clase `pf-sidebar` y modifica el style:

```tsx
<aside
  className="pf-sidebar"
  aria-label="Barra lateral de navegación"
  style={{
    width: 220,
    background: 'var(--pf-white)',
    borderRight: '0.5px solid var(--pf-border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 40,
    transition: 'transform 0.25s ease',
  }}
>
```

En el `<style>` al final del componente, añade:

```tsx
<style>{`
  .pf-nav-item[data-active="false"]:hover { background: var(--pf-surface) !important; }
  @media (max-width: 768px) {
    .pf-hamburger { display: flex !important; }
    .pf-sidebar { transform: translateX(${mobileOpen ? '0' : '-100%'}) !important; }
    .pf-main-content { margin-left: 0 !important; padding: 16px !important; padding-top: 64px !important; }
  }
`}</style>
```

Al elemento `<main>`, añade la clase `pf-main-content`:

```tsx
<main className="pf-main-content" style={{ flex: 1, marginLeft: 220, padding: 32 }}>
```

Importa `Menu` y `X` de lucide-react (verifica que lucide-react ya está instalado con `cat package.json | grep lucide`).

Añade un botón de cerrar dentro del sidebar, visible solo en mobile:

```tsx
{/* Botón cerrar — dentro del sidebar, solo en mobile */}
<button
  onClick={() => setMobileOpen(false)}
  aria-label="Cerrar menú"
  style={{
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'var(--pf-surface)',
    cursor: 'pointer',
    display: 'none', // visible solo via media query
    alignItems: 'center',
    justifyContent: 'center',
  }}
  className="pf-close-sidebar"
>
  <X size={16} style={{ color: 'var(--pf-muted)' }} />
</button>
```

Añade a la sección `<style>`: `.pf-close-sidebar { display: none; } @media (max-width: 768px) { .pf-close-sidebar { display: flex !important; } }`

**Paso 4:** Haz lo mismo para `src/components/admin/AdminLayout.tsx`.

---

## FASE 5 — Verificación final

Después de completar todas las fases, ejecuta:

```bash
# Verificar que no hay errores de TypeScript
npx tsc --noEmit

# Verificar que no hay errores de lint
npm run lint

# Verificar que el build funciona
npm run build
```

Si hay errores de TypeScript o lint, corrígelos antes de hacer commit. No ignores errores con `// @ts-ignore` ni `// eslint-disable`.

---

## Commit

Una vez que el build pase sin errores:

```bash
git add \
  src/app/layout.tsx \
  src/app/vet/layout.tsx \
  src/app/admin/layout.tsx \
  src/app/vet/loading.tsx \
  src/app/admin/loading.tsx \
  src/app/owner/loading.tsx \
  src/app/vet/error.tsx \
  src/app/admin/error.tsx \
  src/app/owner/error.tsx \
  src/app/not-found.tsx \
  src/components/shared/VetLayout.tsx \
  src/components/admin/AdminLayout.tsx \
  src/components/owner/OwnerPetView.tsx \
  src/middleware.ts \
  src/app/vet/dashboard/page.tsx \
  src/app/vet/pets/page.tsx \
  src/app/vet/records/page.tsx \
  src/app/vet/appointments/page.tsx \
  src/app/vet/invitations/page.tsx \
  src/app/vet/team/page.tsx \
  src/app/vet/ai/page.tsx \
  src/app/admin/page.tsx

git commit -m "fix: App Router layouts, mobile sidebar, a11y ARIA, error boundaries and skip-to-content"
git push origin main
```

---

## Restricciones absolutas

- **No modifiques ningún archivo de la carpeta `/api/`** — no toques lógica de servidor
- **No modifiques el schema de Supabase** — solo lee datos
- **No instales dependencias nuevas** — usa solo lo que está en `package.json`
- **No uses `any` en código nuevo** — usa tipos de TypeScript correctos
- **No uses `// @ts-ignore`** — si hay un error de tipos, resuélvelo
- **No reescribas componentes enteros** — modifica solo lo necesario para cada tarea
- **Si un archivo no existe donde esperas encontrarlo, avisa en lugar de inventar su contenido**
- **Lee siempre el archivo completo antes de modificarlo**
