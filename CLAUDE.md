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

### 🔴 CRÍTICO — Siempre que toques rutas de auth, invitaciones o API con datos de usuario
```
skills-ai/security-invitation-flow/SKILL.md
```
Cubre los 16 hallazgos del audit de seguridad (C-1 a L-15): modelo de sobre sellado, tabla `pet_access`, `ALLOWED_INVITATION_ROLES`, ownership checks, fixes para `accept-invite`, `create-invitation`, `appointments`, `ai-chat`, `agent/chat`, `files/[id]`, `upload`, `resend-invitation`.

### 🔴 Auditoría de seguridad — antes de merge de cualquier API route nueva
```
skills-ai/agents/security-auditor.md
```
Agente especializado que actúa como Security Engineer. Genera reportes con severidad (Crítico/Alto/Medio/Bajo), pruebas de concepto y código de fix. Cubre OWASP Top 10, IDOR, auth, Stripe webhooks, OpenAI y Resend.
- Checklist extendida (Stripe, OAuth, headers): `skills-ai/security-and-hardening/security-checklist-extended.md`

### Siempre que toques un archivo `.ts` o `.tsx`
```
skills-ai/coding-best-practices/SKILL.md
```
TypeScript estricto, JSDoc, reglas ESLint activas, patrones Supabase seguros, checklist de commit.

### Antes de construir cualquier página o feature nuevo
```
skills-ai/spec-driven-development/SKILL.md
```
Define un spec con criterios de éxito verificables antes de escribir código. Obligatorio para `/vet/profile`, `/vet/settings`, `/vet/billing`, `/owner/profile` y cualquier feature nuevo.

### Siempre que crees o modifiques UI
```
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
```
- **frontend-design-quality** → tokens `--pf-*`, tintMap, clases utilitarias, StatCard / lista / formulario / empty state.
- **frontend-ui-engineering** → arquitectura de componentes, loading/error/empty states, responsive, anti-patrones AI aesthetic.
- Accesibilidad WCAG 2.1 AA: `skills-ai/frontend-ui-engineering/accessibility-checklist-wcag.md`
- Gaps conocidos del codebase: `skills-ai/frontend-ui-engineering/accessibility-checklist.md`

### Para verificar UI en el browser real (DOM, consola, network, performance)
```
skills-ai/browser-testing-with-devtools/SKILL.md
```
Usa Chrome DevTools MCP para inspeccionar DOM live, capturar errores de consola, analizar requests a Supabase, profiling de Core Web Vitals y verificación visual con screenshots. Usar después de cualquier cambio de UI antes de marcar como done.

### Cuando manejes input, auth, uploads o APIs externas
```
skills-ai/security-and-hardening/SKILL.md
```
Ownership checks, Zod validation, XSS, env vars, rate limiting en rutas IA, errores sin exponer internos.
- Checklist base: `skills-ai/security-and-hardening/security-checklist.md`
- Checklist extendida (Stripe/OpenAI/Resend): `skills-ai/security-and-hardening/security-checklist-extended.md`

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
**Siempre añade `.eq('clinic_id', userClinicId)` al usar `createAdminClient()`.** Ver `skills-ai/security-invitation-flow/SKILL.md`.

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
    ├── supabase/                  ← client.ts, server.ts, admin.ts
    ├── invitation-permissions.ts  ← ALLOWED_INVITATION_ROLES
    ├── metrics.ts                 ← withMetrics() wrapper
    └── email.ts                   ← Resend emails

skills-ai/
├── agents/
│   └── security-auditor.md            ← 🆕 Agente auditor de seguridad
├── security-invitation-flow/SKILL.md  ← 🔴 16 hallazgos de seguridad
├── security-and-hardening/
│   ├── SKILL.md
│   ├── security-checklist.md
│   └── security-checklist-extended.md ← 🆕 Stripe, OAuth, Resend
├── browser-testing-with-devtools/SKILL.md  ← 🆕 DevTools MCP para UI
├── spec-driven-development/SKILL.md        ← 🆕 Specs antes de codear
├── frontend-design-quality/SKILL.md
├── frontend-ui-engineering/
│   ├── SKILL.md
│   ├── accessibility-checklist.md
│   └── accessibility-checklist-wcag.md ← 🆕 Patrones HTML WCAG
├── coding-best-practices/SKILL.md
├── performance-optimization/SKILL.md + performance-checklist.md
├── api-and-interface-design/SKILL.md
├── incremental-implementation/SKILL.md
├── debugging-and-error-recovery/SKILL.md
├── code-review-and-quality/SKILL.md
└── test-driven-development/SKILL.md

prompts/
├── security-fix.md              ← Fix metódico de los 16 hallazgos
├── navigation-fix.md
└── ui-navigation-improvement.md
```
