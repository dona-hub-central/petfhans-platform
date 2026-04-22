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

## Flujo de ramas y merge strategy

### Estructura de ramas

```
main     ← producción — solo código de app, skills curadas, sin tooling de dev
Develop  ← desarrollo — código + skills experimentales + prompts + design files
```

### Regla de merge Develop → main

El archivo `.gitattributes` en `main` define qué directorios conservan **siempre
la versión de `main`** cuando se hace merge desde `Develop` (estrategia `merge=ours`).

**Archivos que NUNCA fluyen de Develop a main automáticamente:**

| Path | Razón |
|------|-------|
| `design_handoff_petfhans/**` | Archivos de diseño, solo necesarios en Develop |
| `frontend.md` | Documento de auditoría, solo relevante en Develop |
| `prompts/**` | Prompts de Claude Code específicos del workflow de Develop |

**Archivos que SÍ fluyen pero requieren revisión en el PR:**

| Path | Qué revisar |
|------|-------------|
| `skills-ai/**` | Verificar que solo llegan skills validadas, no experimentales |
| `CLAUDE.md` | Comparar manualmente — Develop tiene más skills que main |
| `src/**` | Código de aplicación — revisión normal de PR |
| `supabase/migrations/**` | Siempre revisar antes de merge |

### Setup requerido (una vez por developer y por runner de CI)

```bash
# Habilitar el driver merge=ours localmente
git config --global merge.ours.driver true

# En GitHub Actions (añadir al workflow antes del paso de merge):
# - run: git config merge.ours.driver true
```

Sin este comando, `.gitattributes` existe pero la estrategia `merge=ours` no se aplica.

### Limitaciones de este enfoque

`merge=ours` en `.gitattributes` **no es una medida de seguridad** — es higiene de rama.
Los archivos en `prompts/` y `design_handoff_petfhans/` no son vulnerables, son simplemente
irrelevantes en producción. Para protección real:

- Las **variables de entorno** no están en el repo (`.env.local` en `.gitignore`)
- Los **secretos** se gestionan en GitHub Secrets y en el VPS
- La **seguridad del código** la gestionan las skills de `skills-ai/security-*`

---

## Skills disponibles en main

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

> **Nota:** En la rama `Develop` hay más skills disponibles (security-invitation-flow,
> browser-testing-with-devtools, spec-driven-development, agents/security-auditor, etc.).
> Consulta `CLAUDE.md` en `Develop` para el conjunto completo.

---

## Reglas de trabajo obligatorias

1. **Lee el archivo antes de editarlo.** Nunca asumas props, imports ni variables.
2. **Verifica TypeScript después de cada tarea.** `npx tsc --noEmit` antes de continuar.
3. **No instales dependencias nuevas** sin confirmación explícita.
4. **No modifiques el schema de Supabase** a menos que se indique explícitamente.
5. **No toques archivos de API** cuando la tarea es solo de UI, y viceversa.
6. **Nunca hardcodees** colores hex, claves de API ni strings de configuración.
7. **Un commit al final**, formato `type: descripción` (feat / fix / docs / refactor).
8. **Merge Develop → main:** ejecutar `git config merge.ours.driver true` antes del merge.

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

skills-ai/            ← Skills curadas para producción
  (ver Develop/skills-ai/ para el conjunto completo)
```
