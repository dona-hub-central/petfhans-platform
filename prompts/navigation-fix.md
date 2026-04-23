# Prompt para Claude Code — Correcciones de Navegación y Accesibilidad

## Instrucciones de trabajo

Eres un ingeniero frontend senior trabajando en el repositorio de Petfhans. Antes de tocar cualquier archivo, **lee su contenido completo** con `Read`. Nunca inventes props, imports, ni nombres de variables — verifica que existen en el archivo antes de usarlos. Si no estás seguro de algo, detente y pregunta en lugar de asumir.

Ejecuta las tareas en el orden exacto que se indica. Después de cada tarea, corre `npx tsc --noEmit` para verificar que no hay errores de TypeScript antes de continuar con la siguiente.

---

## Contexto del proyecto

- **Framework:** Next.js 16.2.3 con App Router
- **Estilos:** Tailwind CSS 4 + CSS variables en `src/app/globals.css`
- **Auth:** Supabase SSR — `createClient()` de `@/lib/supabase/server` para Server Components
- **Layouts actuales:**
  - `src/components/shared/VetLayout.tsx` — sidebar del panel veterinario (Client Component)
  - `src/components/admin/AdminLayout.tsx` — sidebar del panel admin (Client Component)
- **Archivos de referencia obligatorios:** lee `PRODUCT.md`, `DESIGN_SYSTEM.md` y `prompts/ui-navigation-improvement.md` antes de empezar

---

## TAREA 1 — Crear `src/app/vet/layout.tsx`

**Por qué:** Actualmente cada una de las 14 páginas `/vet/*` importa `VetLayout` manualmente y lo envuelve en su JSX. Esto hace que el sidebar se destruya y reconstruya en cada navegación, lo que rompe cualquier estado local (como el indicador de disponibilidad en tiempo real). Con un `layout.tsx` de segmento, el sidebar persiste.

**Qué hacer:**

1. Lee `src/components/shared/VetLayout.tsx` completo
2. Lee `src/app/vet/dashboard/page.tsx` para entender cómo se pasan `clinicName` y `userName` actualmente
3. Crea `src/app/vet/layout.tsx` como Server Component que:
   - Obtiene el usuario con `createClient()` de `@/lib/supabase/server`
   - Consulta `profiles` para obtener `full_name` y `clinic_id`
   - Consulta `clinics` para obtener el `name` de la clínica usando el `clinic_id`
   - Renderiza `<VetLayout clinicName={...} userName={...}>{children}</VetLayout>`
4. Verifica que `VetLayout` ya acepta `children`, `clinicName` y `userName` como props (están definidos en el componente)
5. NO elimines todavía el `VetLayout` de las páginas individuales — eso va en la TAREA 2

**Verificación:** Corre `npx tsc --noEmit`. El archivo nuevo no debe tener errores.

---

## TAREA 2 — Crear `src/app/admin/layout.tsx`

**Por qué:** Mismo problema que en `/vet/*` — 11 páginas admin importan `AdminLayout` manualmente.

**Qué hacer:**

1. Lee `src/components/admin/AdminLayout.tsx` completo
2. Lee `src/app/admin/page.tsx` para entender cómo se obtiene `userName` actualmente
3. Crea `src/app/admin/layout.tsx` como Server Component que:
   - Obtiene el usuario con `createClient()` de `@/lib/supabase/server`
   - Consulta `profiles` para obtener `full_name`
   - Verifica que `role === 'superadmin'`, si no redirige a `/auth/login`
   - Renderiza `<AdminLayout userName={...}>{children}</AdminLayout>`

**Verificación:** `npx tsc --noEmit`

---

## TAREA 3 — Añadir responsive mobile al sidebar veterinario

**Por qué:** `VetLayout` tiene `position: fixed; width: 220px` sin ninguna media query. En mobile (< 768px) el sidebar ocupa más de la mitad de la pantalla y el contenido queda en ~170px. El panel veterinario es inutilizable en mobile.

**Qué hacer:**

1. Lee `src/components/shared/VetLayout.tsx` completo
2. Añade estado `const [open, setOpen] = useState(false)` para controlar el drawer en mobile
3. Añade un botón hamburger (`☰`) visible solo en mobile que aparece en la esquina superior izquierda del área de contenido — usa la clase CSS `pf-hamburger` que debes definir en el bloque `<style>`
4. En el `<aside>` del sidebar, añade la clase `pf-sidebar` y define en el bloque `<style>` al final del componente:

```css
@media (max-width: 767px) {
  .pf-sidebar {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  .pf-sidebar.open {
    transform: translateX(0);
  }
  .pf-hamburger {
    display: flex;
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 20;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    background: var(--pf-white);
    border: 0.5px solid var(--pf-border);
    border-radius: 10px;
    cursor: pointer;
    font-size: 16px;
  }
  .pf-main-content {
    margin-left: 0 !important;
    padding-top: 56px;
  }
  .pf-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 9;
  }
}
@media (min-width: 768px) {
  .pf-hamburger { display: none; }
  .pf-overlay { display: none; }
}
```

5. Añade `className={`pf-sidebar${open ? ' open' : ''}`}` al `<aside>`
6. Añade `className="pf-main-content"` al `<main>`
7. Cuando el usuario hace clic en un nav link, cierra el drawer: añade `onClick={() => setOpen(false)}` a cada `<Link>` del nav
8. El overlay (fondo oscuro) al hacer clic también cierra el drawer

**No cambies el comportamiento en desktop.** Solo añade las clases y el estado mobile.

**Verificación:** `npx tsc --noEmit`

---

## TAREA 4 — Corregir `<a>` por `<Link>` en OwnerPetView

**Por qué:** En `OwnerPetView.tsx` el enlace de regreso al dashboard es un anchor nativo `<a href>` que fuerza un full page reload, perdiendo el caché del router de Next.js.

**Qué hacer:**

1. Lee `src/components/owner/OwnerPetView.tsx`
2. Busca exactamente esta línea:
   ```tsx
   <a href="/owner/dashboard" className="back-link">‹ Mis mascotas</a>
   ```
3. Reemplázala por:
   ```tsx
   <Link href="/owner/dashboard" className="back-link">‹ Mis mascotas</Link>
   ```
4. Verifica que `Link` ya está importado de `next/link` en el archivo — si no, añade el import al principio del archivo junto a los otros imports

**Verificación:** `npx tsc --noEmit`

---

## TAREA 5 — Corregir brecha de seguridad en middleware

**Por qué:** En `src/middleware.ts` la condición `subdomain === ''` hace que cualquier request sin subdominio (ej: `petfhans.com/vet/pets`) salte todos los guards de autenticación y acceda directamente a las páginas protegidas.

**Qué hacer:**

1. Lee `src/middleware.ts` completo
2. Localiza exactamente esta línea (línea ~54):
   ```typescript
   if (publicPaths.some(p => path.startsWith(p)) || subdomain === '') {
     return supabaseResponse
   }
   ```
3. Reemplázala por:
   ```typescript
   if (publicPaths.some(p => path.startsWith(p))) {
     return supabaseResponse
   }

   // Sin subdominio → redirigir a login (no hay portal sin clínica)
   if (subdomain === '' && !isLocalhost) {
     return NextResponse.redirect(new URL('/auth/login', request.url))
   }
   ```
4. La variable `isLocalhost` ya está definida más arriba en el mismo archivo — no la redefinas

**Verificación:** `npx tsc --noEmit`. Verifica que el tipo de retorno sigue siendo correcto.

---

## TAREA 6 — Quick Wins de accesibilidad (todos en un solo commit)

**Por qué:** El proyecto tiene 0 atributos ARIA en todo el codebase. Estas correcciones son de bajo riesgo y alto impacto.

### 6.1 — `layout.tsx`: eliminar `maximumScale` y añadir skip-link

1. Lee `src/app/layout.tsx`
2. En el objeto `viewport` (exportado como `export const viewport: Viewport`), elimina la línea `maximumScale: 1,` — esta línea bloquea el zoom de accesibilidad en iOS
3. En el `<body>`, añade como primer hijo el skip-link:
   ```tsx
   <a
     href="#main-content"
     style={{
       position: 'absolute', top: '-40px', left: 0, zIndex: 9999,
       background: 'var(--pf-coral)', color: '#fff',
       padding: '8px 16px', borderRadius: '0 0 8px 0',
       fontSize: '14px', fontWeight: 600, textDecoration: 'none',
       transition: 'top 0.2s',
     }}
     onFocus={(e) => { (e.currentTarget as HTMLElement).style.top = '0' }}
     onBlur={(e) => { (e.currentTarget as HTMLElement).style.top = '-40px' }}
   >
     Ir al contenido principal
   </a>
   ```
4. En el `<body>`, añade `id="main-content"` al elemento `<main>` o `<div>` que envuelve el contenido principal. Si no hay un `<main>` en `layout.tsx` (el `<body>` solo tiene `{children}`), añade el id al `<body>` directamente no es lo correcto — en su lugar añade un `<main id="main-content" className="min-h-full flex flex-col">` que envuelva `{children}` dentro del body.

### 6.2 — `VetLayout.tsx`: aria en nav y links

1. Lee `src/components/shared/VetLayout.tsx`
2. Al `<nav>` del sidebar añade `aria-label="Navegación principal"`
3. A cada `<Link>` del nav map añade `aria-current={active ? 'page' : undefined}`
4. Al avatar del usuario en el bloque inferior, añade `aria-label={`Perfil de ${userName}`}` al div que contiene la inicial

### 6.3 — `AdminLayout.tsx`: aria en nav y links

Mismos cambios que 6.2 pero en `src/components/admin/AdminLayout.tsx`:
1. `aria-label="Navegación principal"` al `<nav>`
2. `aria-current={active ? 'page' : undefined}` a cada Link
3. `aria-label={`Perfil de ${userName}`}` al avatar

### 6.4 — `OwnerPetView.tsx`: tabs ARIA básicas

1. Lee `src/components/owner/OwnerPetView.tsx`
2. Al contenedor de tabs (el `<div className="mob-tabs">`), añade `role="tablist"` y `aria-label="Secciones de la mascota"`
3. A cada `<button>` de tab dentro del map, añade:
   - `role="tab"`
   - `aria-selected={tab === key}`
   - `aria-controls={`panel-${key}`}`
   - `id={`tab-${key}`}`
4. Al div de contenido que contiene el contenido de cada tab (el `<div>` que renderiza el contenido activo), añade:
   - `role="tabpanel"`
   - `id={`panel-${tab}`}`
   - `aria-labelledby={`tab-${tab}`}`

### 6.5 — `PetGallery.tsx`: lightbox accesible

1. Lee `src/components/owner/PetGallery.tsx`
2. Al div del lightbox (el que tiene `position: 'fixed', inset: 0`) añade:
   - `role="dialog"`
   - `aria-modal="true"`
   - `aria-label="Foto ampliada"`
3. Al botón de cerrar dentro del lightbox, asegúrate de que tiene `aria-label="Cerrar"`
4. Añade handler de teclado para cerrar con Escape:
   ```tsx
   useEffect(() => {
     if (!lightbox) return
     const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
     document.addEventListener('keydown', handler)
     return () => document.removeEventListener('keydown', handler)
   }, [lightbox])
   ```

**Verificación final de toda la TAREA 6:** `npx tsc --noEmit`

---

## TAREA 7 — Añadir `loading.tsx` en segmentos principales

**Por qué:** No existe ningún `loading.tsx` en el proyecto. Cuando las Server Pages cargan datos de Supabase, el usuario ve una pantalla en blanco. Next.js App Router usa `loading.tsx` para mostrar un skeleton automáticamente.

**Qué hacer:**

Crea los siguientes 3 archivos con el mismo contenido base, ajustando el número de skeletons según el contenido de cada sección:

**`src/app/vet/loading.tsx`:**
```tsx
export default function VetLoading() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 80, borderRadius: 14,
          background: 'linear-gradient(90deg, var(--pf-surface) 25%, var(--pf-border) 50%, var(--pf-surface) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
```

**`src/app/admin/loading.tsx`:** Mismo contenido que `vet/loading.tsx`, cambia el nombre de la función a `AdminLoading`.

**`src/app/owner/loading.tsx`:** Mismo contenido pero con `padding: 16` y 2 skeletons de `height: 120` para simular las tarjetas de mascota. Nombre de función: `OwnerLoading`.

**Verificación:** `npx tsc --noEmit`

---

## TAREA 8 — Añadir `error.tsx` en segmentos principales

**Por qué:** No existe ningún `error.tsx`. Los errores de Supabase (network error, RLS block) llegan al usuario como texto crudo de Next.js.

**Nota importante:** Los archivos `error.tsx` DEBEN ser Client Components (`'use client'`) porque reciben `error` y `reset` como props.

Crea los siguientes 3 archivos:

**`src/app/vet/error.tsx`:**
```tsx
'use client'

export default function VetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 32,
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{
        fontFamily: 'var(--pf-font-display)', fontSize: 20,
        color: 'var(--pf-ink)', margin: 0,
      }}>
        Algo salió mal
      </h2>
      <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: 0, textAlign: 'center' }}>
        No se pudo cargar esta sección. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        style={{
          background: 'var(--pf-coral)', color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 24px', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pf-font-body)',
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
```

**`src/app/admin/error.tsx`:** Mismo contenido, nombre `AdminError`.

**`src/app/owner/error.tsx`:** Mismo contenido, nombre `OwnerError`. Cambia el padding a `16`.

**Verificación:** `npx tsc --noEmit`

---

## Commit final

Una vez completadas y verificadas todas las tareas sin errores de TypeScript, haz un único commit:

```bash
git add \
  src/app/vet/layout.tsx \
  src/app/admin/layout.tsx \
  src/app/vet/loading.tsx \
  src/app/admin/loading.tsx \
  src/app/owner/loading.tsx \
  src/app/vet/error.tsx \
  src/app/admin/error.tsx \
  src/app/owner/error.tsx \
  src/components/shared/VetLayout.tsx \
  src/components/admin/AdminLayout.tsx \
  src/components/owner/OwnerPetView.tsx \
  src/components/owner/PetGallery.tsx \
  src/app/layout.tsx \
  src/middleware.ts

git commit -m "fix: segment layouts, mobile sidebar, a11y improvements, security guard and error boundaries"
git push origin main
```

---

## Qué NO hacer

- ❌ No elimines el `VetLayout` import de las páginas individuales todavía — primero verifica que el `layout.tsx` funciona en producción
- ❌ No instales dependencias nuevas — usa solo lo que está en `package.json`
- ❌ No cambies el schema de Supabase — solo lee, no crees columnas nuevas
- ❌ No cambies colores, fuentes ni border-radius — usa siempre `var(--pf-*)` existentes
- ❌ No uses `any` en TypeScript — si el tipo no está claro, usa `unknown` y narrowing
- ❌ No modifiques archivos de API routes (`src/app/api/*`) ni de lógica de negocio
- ❌ No asumas que una variable o prop existe — léela en el archivo antes de usarla
