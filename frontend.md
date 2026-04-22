# Petfhans — Frontend Technical Audit

**Fecha:** 2026-04-22  
**Autor:** Ingeniería Frontend (Staff Review)  
**Stack:** Next.js 16.2.3 · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase SSR · lucide-react 1.8.0

---

## 1. Navegación — Routing Architecture & Accessibility

### 1.1 Arquitectura de Rutas

El proyecto utiliza el **App Router** de Next.js 16 con Server Components, pero aplica sólo **una fracción** del modelo que ofrece esta arquitectura.

**Estructura actual:**

```
src/app/
├── layout.tsx          ← único layout raíz (correcto)
├── auth/               ← páginas públicas
├── admin/              ← panel superadmin
├── vet/                ← panel veterinario
└── owner/              ← portal dueño de mascota
```

**Problema crítico — ausencia de layouts por segmento:**  
No existe ningún `layout.tsx` dentro de `/vet/`, `/admin/` ni `/owner/`. En cambio, cada página del panel veterinario importa y renderiza manualmente `VetLayout` (un Client Component con `'use client'`), repitiendo el patrón en al menos **12 páginas**. El resultado:

- La autenticación se verifica con código duplicado (`supabase.auth.getUser()`) en cada page.tsx.
- `VetLayout` es un `'use client'` que podría ser parcialmente Server Component; actualmente dispara un `fetch('/api/vet/usage')` en cada montaje.
- El sidebar de navegación se vuelve a renderizar (HTML + JS) en cada transición de página en lugar de persistir como layout.

**Problema — Middleware con round-trip a base de datos:**  
`src/middleware.ts` realiza **dos consultas** a Supabase por cada request autenticado no estático:

1. `supabase.auth.getUser()` — obligatoria para refrescar sesión (línea 49).
2. `supabase.from('profiles').select('role, clinic_id, clinics(slug)')` — consulta adicional para validar rol y subdominio (líneas 66–70).

Con 8 rutas de navegación activas y tráfico concurrente, esto multiplica la latencia de cada page view. El `role` ya existe en `user_metadata` del JWT; sólo falta `clinic_slug` para eliminar esta segunda consulta.

**Problema — Sin archivos de límite de segmento:**  
No existe ningún `loading.tsx`, `error.tsx` ni `not-found.tsx` en todo el árbol de rutas. Consecuencias:
- El usuario ve una pantalla en blanco mientras las Server Pages cargan datos.
- Los errores de Supabase (mensajes crudos como `"null value in column 'id' violates not-null constraint"`) llegan sin filtrar al cliente en caso de excepción no capturada.
- Las rutas inexistentes (ej. `/vet/pets/id-invalido`) aterrizan en la pantalla de error genérica de Next.js.

---

### 1.2 Accesibilidad (a11y)

El resultado del análisis de accesibilidad es **severo**: cero atributos ARIA en todo el codebase.

| Componente | Problema |
|---|---|
| `VetLayout` nav | Links activos tienen estilo visual pero **ningún** `aria-current="page"` |
| `BreedSelect` | Combobox custom sin `role="combobox"`, `aria-expanded`, ni `aria-autocomplete` |
| `PetGallery` lightbox | Modal sin `aria-modal`, sin trap de foco, `Escape` no cierra |
| `BookAppointment` | Formulario sin `aria-describedby` en errores |
| `OwnerPetView` tabs | Tabs sin `role="tablist"` / `role="tab"` / `aria-selected` |
| Nav links (owner) | `<a href="/owner/dashboard">` sin `aria-label` |

**Problemas adicionales:**

- `viewport: { maximumScale: 1 }` en `src/app/layout.tsx:70` — bloquea el zoom de accesibilidad en iOS, violando WCAG 1.4.4.
- No existe ningún **skip-to-content link** (`<a href="#main">`), lo que obliga a usuarios de teclado a tabular por todo el sidebar en cada página.
- La navegación mobile del portal del dueño (`OwnerPetView`) usa `<button>` sin `aria-selected` para las tabs.
- Ningún `<img>` tiene `alt` descriptivo contextual — todos usan `alt=""` o `alt={file_name}` (nombre técnico de archivo).

---

### 1.3 Fricción de Usuario e Información Architecture

**Owner portal — information architecture:**  
El portal del dueño está organizado alrededor de la mascota (ficha, citas, galería, docs, historial), lo cual es correcto. Sin embargo:
- Desde el dashboard no hay acceso directo a citas activas ni a resultados recientes sin navegar a la ficha de cada mascota.
- La única forma de agendar una cita virtual es actualmente inexistente — el formulario sólo soporta citas presenciales.

**Vet panel — navegación:**  
El sidebar tiene 8 ítems de navegación pero no tiene agrupación visual (secciones). A medida que la app crezca (billing, analytics, IA, equipo), la usabilidad del sidebar decaerá sin jerarquía.

**Forms UX:**  
- `BreedSelect` cambia el valor del formulario mientras el usuario escribe (onChange inmediato), lo que puede causar guardados parciales si el usuario tarda en seleccionar.
- El botón de submit en varios formularios no tiene estado de `disabled` durante la carga de datos previos, permitiendo doble-submit.

---

## 2. Funcionalidad — Performance & Technical Debt

### 2.1 Cuellos de Botella de Rendimiento

**N+1 query — Owner Dashboard:**  
`src/app/owner/dashboard/page.tsx` líneas 21–27 ejecuta **una consulta individual por mascota** para obtener su próxima visita:

```typescript
// PROBLEMA: si el dueño tiene 5 mascotas = 5 round-trips seriales a Supabase
const petsWithInfo = await Promise.all((pets ?? []).map(async (pet) => {
  const { data: next } = await admin.from('medical_records')
    .select('next_visit').eq('pet_id', pet.id)...
    .single()
  return { ...pet, nextVisit: next?.next_visit }
}))
```

La solución correcta es un `select ... where pet_id IN (...)` único o una join en la primera query.

**N signed URL calls — Owner Pet Page:**  
`src/app/owner/pets/[id]/page.tsx` líneas 32–35 genera una URL firmada **por cada foto**:

```typescript
const photosWithUrls = await Promise.all(photoFiles.map(async (f) => {
  const { data } = await admin.storage.from('pet-files').createSignedUrl(f.file_path, 3600*24)
  return { ...f, publicUrl: data?.signedUrl || '' }
}))
```

Supabase ofrece `createSignedUrls` (plural) que resuelve todo en un único request al servidor de storage.

**VetLayout usage fetch sin cache:**  
`src/components/shared/VetLayout.tsx` línea 32 ejecuta `fetch('/api/vet/usage')` en cada montaje sin `cache`, `stale-while-revalidate` ni ningún header de caché. Cada clic en el sidebar recarga este dato, que cambia raramente.

**Doble carga de fuentes (Google Fonts):**  
`src/app/layout.tsx` línea 80 incluye una `<link>` a Google Fonts (Bricolage Grotesque + DM Sans). Si `globals.css` también tiene un `@import url('https://fonts.googleapis.com/...')` (patrón común al iniciar con CSS), las fuentes se descargan **dos veces**, bloqueando el renderizado.  
La solución correcta es `next/font/google` que optimiza, preconecta y sirve las fuentes sin round-trip externo.

**Sin `next/image` en ningún lugar:**  
Se encontraron **5 etiquetas `<img>` nativas** distribuidas en:
- `src/components/shared/VetLayout.tsx` — logo sidebar
- `src/components/shared/PetAvatar.tsx` — avatar de mascota
- `src/components/admin/AdminLayout.tsx` — logo admin
- `src/components/owner/PetGallery.tsx` (×2) — galería de fotos

Ninguna de ellas usa `next/image`, perdiendo: optimización automática a WebP/AVIF, lazy loading con LCP hint, `srcSet` responsivo, y prevención de Cumulative Layout Shift.

---

### 2.2 Seguridad

**IDOR en AI Chat — Crítico:**  
`src/app/api/vet/ai-chat/route.ts` líneas 26–32 permite que cualquier usuario autenticado pase un `pet_id` arbitrario y obtenga el historial médico completo del animal via el cliente admin (bypassa RLS):

```typescript
// Sin validación de propiedad — cualquier vet de cualquier clínica puede ver cualquier mascota
const { data: pet } = await admin.from('pets')
  .select('*, profiles!pets_owner_id_fkey(full_name)')
  .eq('id', pet_id).single()   // ← falta .eq('clinic_id', userClinicId)
```

**API Key de OpenAI en base de datos:**  
La clave de OpenAI se almacena en la tabla `ai_agent.openai_api_key` y se lee en cada request de chat mediante el cliente admin. Cualquier brecha en el acceso a la base de datos expone la clave. Debe migrarse a `process.env.OPENAI_API_KEY`.

**Dependencia muerta — `@anthropic-ai/sdk`:**  
`package.json` declara `@anthropic-ai/sdk ^0.87.0` pero no existe ningún `import` de este paquete en el codebase. El AI chat usa `fetch` crudo a la API de OpenAI. Esta dependencia suma ~2 MB al bundle de servidor sin beneficio.

---

### 2.3 Deuda Técnica de Arquitectura

**Sin gestión de estado global:**  
No existe ninguna solución de estado global (Context, Zustand, Jotai). Actualmente no es bloqueante, pero al agregar features como notificaciones en tiempo real, estado de sesión compartido o caché de datos entre páginas, la ausencia de estado global se convertirá en deuda difícil de pagar.

**898 ocurrencias de `style={{}}`:**  
La prevalencia de inline styles hace imposible aplicar cambios de tema globales, dificulta el testing visual, e impide el uso de design tokens en modo oscuro futuro. La regla debería ser: tokens CSS (`var(--pf-*)`) para colores/espaciado, clases Tailwind para layout.

**301 colores hexadecimales hardcodeados:**  
Valores como `#EE726D`, `#f2f2f7`, `#1c1c1e` aparecen incrustados directamente en JSX, duplicando valores que ya existen como tokens (`--pf-coral`, `--pf-bg`, `--pf-ink`). Una refactorización del `BookAppointment.tsx` (el peor caso) eliminaría ~40 instancias en un solo archivo.

**Sin tests:**  
No existe ningún archivo `*.test.ts`, `*.spec.ts`, ni configuración de testing (Jest, Vitest, Playwright). Para un SaaS con lógica de negocio crítica (facturación con Stripe, registros médicos, citas), la ausencia total de tests automatizados es un riesgo operativo.

**`VetLayout` como Client Component innecesario:**  
El sidebar de VetLayout no tiene interactividad real excepto el `fetch('/api/vet/usage')` en el `useEffect`. Podría refactorizarse como Server Component con un pequeño Client Component sólo para el indicador de uso, reduciendo el JS enviado al cliente.

**Perfil redundante en `records/new`:**  
`src/app/vet/records/new/page.tsx` realiza una consulta `profiles` aunque el perfil ya fue autenticado en el middleware. Este patrón se repite en múltiples páginas vet.

---

## 3. Plan de Acción Técnico Priorizado

### Quick Wins — Alto impacto, implementación rápida (< 1 día cada uno)

| # | Acción | Archivo(s) | Impacto |
|---|---|---|---|
| QW-1 | **Eliminar `@anthropic-ai/sdk`** de `package.json` | `package.json` | Reduce bundle de servidor ~2 MB |
| QW-2 | **Eliminar `maximumScale: 1`** del viewport | `src/app/layout.tsx:70` | Cumple WCAG 1.4.4, sin riesgo |
| QW-3 | **Reemplazar N+1** en owner dashboard con un `IN` query | `src/app/owner/dashboard/page.tsx:21-27` | Elimina N round-trips a Supabase |
| QW-4 | **Usar `createSignedUrls`** (plural) para fotos de mascota | `src/app/owner/pets/[id]/page.tsx:32-35` | Un request en vez de N |
| QW-5 | **Fix IDOR en AI chat**: añadir `.eq('clinic_id', userClinicId)` | `src/app/api/vet/ai-chat/route.ts:27` | Elimina vulnerabilidad crítica |
| QW-6 | **Mover OpenAI key** a `OPENAI_API_KEY` env var | `route.ts` + `AgentConfig.tsx` | Elimina riesgo de exposición |
| QW-7 | **Añadir `aria-current="page"`** a los nav links del sidebar | `VetLayout.tsx:76-90` | Mejora a11y con 1 línea |
| QW-8 | **Añadir `role="combobox"` y `aria-expanded`** a BreedSelect | `BreedSelect.tsx:92-101` | WCAG 4.1.2 |
| QW-9 | **Cache del usage fetch** en VetLayout con `Cache-Control` | `VetLayout.tsx:32` + API route | Elimina fetch redundante en cada nav |
| QW-10 | **Crear `loading.tsx`** en `/vet/` y `/owner/` | Nuevos archivos | Elimina pantalla en blanco |

---

### Technical Debt — Refactorizaciones mid-term (1–5 días cada una)

| # | Acción | Descripción | Esfuerzo |
|---|---|---|---|
| TD-1 | **Layouts por segmento** | Crear `src/app/vet/layout.tsx` y `src/app/admin/layout.tsx` que centralicen auth check y VetLayout, eliminando el patrón manual en 12 páginas | 1 día |
| TD-2 | **Middleware sin DB** | Guardar `clinic_slug` en `user_metadata` al aceptar invitación; leer `role` y `clinic_slug` del JWT en middleware para eliminar la segunda query Supabase | 0.5 días |
| TD-3 | **Migrar fuentes a `next/font`** | Reemplazar `<link>` de Google Fonts con `next/font/google` en el root layout | 1–2 horas |
| TD-4 | **Reemplazar `<img>` con `next/image`** | 5 instancias: VetLayout logo, PetAvatar, AdminLayout logo, PetGallery (×2) | 2–3 horas |
| TD-5 | **Error boundaries** | Crear `error.tsx` en `/vet/`, `/admin/`, `/owner/` con mensaje amigable y sin exponer strings de Supabase | 1 día |
| TD-6 | **Migrar BookAppointment de hardcoded colors a tokens** | Reemplazar ~40 valores hex con `var(--pf-*)` y Tailwind | 2–3 horas |
| TD-7 | **Fix ARIA en OwnerPetView tabs** | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` | 2–3 horas |
| TD-8 | **Lightbox accesible en PetGallery** | `aria-modal`, trap de foco, cerrar con Escape | 2–3 horas |
| TD-9 | **Setup testing** | Configurar Vitest + React Testing Library; añadir tests para rutas API críticas (ai-chat, appointments, auth) | 2–3 días |
| TD-10 | **Skip-to-content link** | Añadir `<a href="#main-content" className="sr-only focus:not-sr-only">` en root layout | 30 minutos |

---

*Fin del informe. Versión 1.0 — generado a partir de análisis estático directo del repositorio.*
