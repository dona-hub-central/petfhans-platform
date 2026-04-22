# Petfhans Platform — Instrucciones para Claude Code

@AGENTS.md

---

## Stack

- **Framework:** Next.js 16.2.3 — App Router, Server Components por defecto
- **Lenguaje:** TypeScript con `strict: true`
- **Estilos:** Tailwind CSS 4 + CSS variables `--pf-*` en `src/app/globals.css`
- **Base de datos / Auth:** Supabase SSR
- **Pagos:** Stripe
- **IA:** OpenAI GPT-4o (rutas `/api/vet/ai-chat` y `/api/agent/chat`)
- **Email:** Resend
- **Iconos:** `lucide-react` — nunca emoji como iconos de UI
- **Path alias:** `@/*` → `./src/*`

---

## Skills — léelas según la tarea

### Siempre que toques un archivo `.ts` o `.tsx`

```
skills-ai/coding-best-practices/SKILL.md
```

Cubre: TypeScript estricto, JSDoc, reglas ESLint activas, patrones Supabase seguros, brechas de seguridad comunes, checklist de commit.

### Siempre que crees o modifiques UI (componentes, páginas, layouts)

```
skills-ai/frontend-design-quality/SKILL.md
```

Cubre: tokens `--pf-*`, patrón `tintMap`, clases utilitarias de `globals.css`, plantillas de StatCard / lista / formulario / empty state, reglas de iconos y tipografía, checklist visual.

### Para contexto de producto y rutas

```
PRODUCT.md
```

Cubre: roles de usuario, rutas existentes, rutas que faltan, flujos críticos, modelo de negocio.

### Para contexto de diseño visual

```
DESIGN_SYSTEM.md
```

Cubre: paleta de colores, tipografía, componentes de referencia, reglas de motion.

---

## Reglas de trabajo obligatorias

1. **Lee el archivo antes de editarlo.** Nunca asumas props, imports ni variables — verifícalos en el archivo real.
2. **Verifica TypeScript después de cada tarea.** Corre `npx tsc --noEmit` antes de continuar con la siguiente.
3. **No instales dependencias nuevas** sin confirmación explícita. Usa solo lo que está en `package.json`.
4. **No modifiques el schema de Supabase** (tablas, columnas, políticas RLS) a menos que se indique explícitamente.
5. **No toques archivos de API** (`src/app/api/*`) cuando la tarea es solo de UI, y viceversa.
6. **Nunca hardcodees** colores hex, claves de API ni strings de configuración. Usa siempre `var(--pf-*)` y `process.env.*`.
7. **Un commit al final**, no uno por archivo. El mensaje sigue el formato `type: descripción` (feat / fix / docs / refactor).

---

## Clientes de Supabase — cuál usar dónde

| Cliente | Import | Usar en |
|---|---|---|
| `createClient()` | `@/lib/supabase/client` | Client Components (`'use client'`) |
| `createClient()` | `@/lib/supabase/server` | Server Components y `layout.tsx` |
| `createAdminClient()` | `@/lib/supabase/admin` | API Routes y Server Components que necesitan bypassar RLS |

`createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY`. **Nunca en archivos con `'use client'`.**

---

## Estructura de directorios relevante

```
src/
├── app/
│   ├── admin/          ← Panel superadmin (layout.tsx + páginas)
│   ├── vet/            ← Panel veterinario (layout.tsx + páginas)
│   ├── owner/          ← Portal dueño de mascota
│   ├── auth/           ← Login, invite
│   └── api/            ← API Routes (no tocar en tareas de UI)
├── components/
│   ├── admin/          ← AdminLayout y componentes del panel admin
│   ├── shared/         ← VetLayout, PetAvatar, PetSearch, PetFiles, BreedSelect
│   └── owner/          ← OwnerPetView, BookAppointment, PetGallery
└── lib/
    ├── supabase/       ← client.ts, server.ts, admin.ts
    ├── metrics.ts      ← withMetrics() wrapper para API routes de IA
    └── email.ts        ← sendInvitationEmail, sendWelcomeEmail (Resend)

skills-ai/
├── coding-best-practices/SKILL.md
└── frontend-design-quality/SKILL.md

prompts/
├── navigation-fix.md              ← Correcciones de navegación y accesibilidad
└── ui-navigation-improvement.md  ← Páginas de perfil, billing y breadcrumbs
```
