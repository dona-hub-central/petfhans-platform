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

Lee la skill correspondiente **antes de escribir cualquier código**.

### Siempre que toques un archivo `.ts` o `.tsx`
```
skills-ai/coding-best-practices/SKILL.md
```
TypeScript estricto, JSDoc, reglas ESLint activas, patrones Supabase seguros, checklist de commit.

### Siempre que crees o modifiques UI
```
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
```
- **frontend-design-quality** → tokens `--pf-*`, tintMap, clases utilitarias, StatCard / lista / formulario / empty state.
- **frontend-ui-engineering** → arquitectura de componentes, loading/error/empty states, responsive, anti-patrones AI aesthetic.
- Accesibilidad: `skills-ai/frontend-ui-engineering/accessibility-checklist.md`

### Cuando manejes input, auth, uploads o APIs externas
```
skills-ai/security-and-hardening/SKILL.md
```
Ownership checks, Zod validation, XSS, env vars, rate limiting en rutas IA, errores sin exponer internos.
- Checklist: `skills-ai/security-and-hardening/security-checklist.md`

### Cuando implementes queries Supabase, imágenes, fuentes o fetches en bucle
```
skills-ai/performance-optimization/SKILL.md
```
N+1 Supabase, `createSignedUrls` plural, `next/font`, `next/image`, paginación, cache headers.
- Checklist: `skills-ai/performance-optimization/performance-checklist.md`

### Cuando crees o modifiques API routes (`src/app/api/*`)
```
skills-ai/api-and-interface-design/SKILL.md
```
Plantilla de route, error shape consistente, tipos compartidos, paginación obligatoria, ownership scoping.

### Cuando implementes algo que toca más de un archivo
```
skills-ai/incremental-implementation/SKILL.md
```
Slices verticales, scope discipline, feature flags, keep compilable between slices.

### Cuando encuentres un bug o fallo inesperado
```
skills-ai/debugging-and-error-recovery/SKILL.md
```
Stop-the-line rule, PM2 logs, Supabase silent failures, root cause vs symptom.

### Cuando vayas a hacer merge o revisar código
```
skills-ai/code-review-and-quality/SKILL.md
```
Five-axis review, severity labels, checklist de PR, dependency discipline.

### Cuando implementes lógica nueva o corrijas un bug
```
skills-ai/test-driven-development/SKILL.md
```
Setup de Vitest, patrones de test para API routes y utilidades, Prove-It Pattern para bugs.

### Para contexto de producto y rutas
```
PRODUCT.md
```

### Para contexto de diseño visual
```
DESIGN_SYSTEM.md
```

---

## Reglas de trabajo obligatorias

1. **Lee el archivo antes de editarlo.** Nunca asumas props, imports ni variables.
2. **Verifica TypeScript después de cada tarea.** `npx tsc --noEmit` antes de continuar.
3. **No instales dependencias nuevas** sin confirmación explícita.
4. **No modifiques el schema de Supabase** a menos que se indique explícitamente.
5. **No toques archivos de API** cuando la tarea es solo de UI, y viceversa.
6. **Nunca hardcodees** colores hex, claves de API ni strings de configuración.
7. **Un commit al final**, formato `type: descripción` (feat / fix / docs / refactor).

---

## Clientes de Supabase — cuál usar dónde

| Cliente | Import | Usar en |
|---|---|---|
| `createClient()` | `@/lib/supabase/client` | Client Components (`'use client'`) |
| `createClient()` | `@/lib/supabase/server` | Server Components y `layout.tsx` |
| `createAdminClient()` | `@/lib/supabase/admin` | API Routes y Server Components que bypasan RLS |

`createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY`. **Nunca en archivos con `'use client'`.**
Siempre añade `.eq('clinic_id', userClinicId)` al usar `createAdminClient()`.

---

## Estructura de directorios

```
src/
├── app/
│   ├── admin/          ← Panel superadmin (layout.tsx + páginas)
│   ├── vet/            ← Panel veterinario (layout.tsx + páginas)
│   ├── owner/          ← Portal dueño de mascota
│   ├── auth/           ← Login, invite
│   └── api/            ← API Routes
├── components/
│   ├── admin/          ← AdminLayout
│   ├── shared/         ← VetLayout, PetAvatar, PetSearch, PetFiles, BreedSelect
│   └── owner/          ← OwnerPetView, BookAppointment, PetGallery
└── lib/
    ├── supabase/       ← client.ts, server.ts, admin.ts
    ├── metrics.ts      ← withMetrics() wrapper
    └── email.ts        ← Resend emails

skills-ai/
├── coding-best-practices/SKILL.md
├── frontend-design-quality/SKILL.md
├── frontend-ui-engineering/SKILL.md + accessibility-checklist.md
├── security-and-hardening/SKILL.md + security-checklist.md
├── performance-optimization/SKILL.md + performance-checklist.md
├── api-and-interface-design/SKILL.md      ← NEW
├── incremental-implementation/SKILL.md    ← NEW
├── debugging-and-error-recovery/SKILL.md  ← NEW
├── code-review-and-quality/SKILL.md       ← NEW
└── test-driven-development/SKILL.md       ← NEW

prompts/
├── navigation-fix.md
└── ui-navigation-improvement.md
```
