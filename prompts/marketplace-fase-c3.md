# Fase C.3 — UI del Marketplace
## Sesión independiente de Claude Code

**Objetivo:** Crear las páginas y componentes visuales del marketplace.
**Prerequisito:** Fase C.2 completada (rutas GET funcionando)

---

## Antes de empezar

Lee estos archivos:
```
prompts/marketplace-multiclínica.md
skills-ai/frontend-design-quality/SKILL.md
skills-ai/frontend-ui-engineering/SKILL.md
skills-ai/coding-best-practices/SKILL.md
skills-ai/spec-driven-development/SKILL.md
```

Verifica que las rutas de C.2 existen:
```bash
find src/app/api/marketplace -name "route.ts"
# Debe mostrar al menos 3 archivos
```

---

## Spec de diseño

### Estructura de rutas nuevas
```
src/app/marketplace/
  layout.tsx                    ← layout del marketplace (navbar, auth check)
  clinicas/
    page.tsx                    ← listado + búsqueda de clínicas
  clinicas/[slug]/
    page.tsx                    ← perfil público de clínica
  veterinarios/
    page.tsx                    ← listado + búsqueda de vets

src/components/marketplace/
  MarketplaceClinicCard.tsx     ← card de clínica
  MarketplaceVetCard.tsx        ← card de vet
  MarketplaceSearch.tsx         ← barra de búsqueda reutilizable
  ClinicPublicProfile.tsx       ← sección de perfil completo
```

### Tokens de diseño a usar
- Colores: `var(--pf-coral)`, `var(--pf-ink)`, `var(--pf-muted)`, `var(--pf-surface)`
- Radios: `var(--pf-r-md)`, `var(--pf-r-lg)`
- Fuentes: `var(--pf-text-h2)`, `var(--pf-text-body)`, `var(--pf-text-small)`
- Iconos: `lucide-react` — nunca emoji
- Badge verificada: fondo `var(--pf-coral-soft)`, texto `var(--pf-coral)`

---

## Componente 1 — `MarketplaceClinicCard`

```typescript
type MarketplaceClinicCardProps = {
  id: string
  name: string
  slug: string
  city: string | null
  verified: boolean
  rating_avg: number | null
  rating_count: number
  public_profile: {
    description?: string
    specialties?: string[]
    cover_url?: string
  } | null
}
```

Card que muestra: nombre, ciudad, badge verificada, rating con estrellas, especialidades (máx 3), botón "Ver clínica" que navega a `/marketplace/clinicas/[slug]`.

---

## Componente 2 — `MarketplaceVetCard`

```typescript
type MarketplaceVetCardProps = {
  id: string
  full_name: string
  role: string
  clinics: Array<{ id: string; name: string; slug: string }>
}
```

Card que muestra: nombre, rol, clínicas donde atiende (lista corta), botón "Ver perfil".

---

## Layout del marketplace

`src/app/marketplace/layout.tsx` — verifica auth y muestra el navbar de la app.
Si no hay sesión, redirige a `/auth/login`.
No usa VetLayout — es un layout propio más simple.

---

## Página `/marketplace/clinicas`

- Carga inicial: `GET /api/marketplace/clinics`
- Barra de búsqueda que hace nueva llamada con `?q=...`
- Grid de `MarketplaceClinicCard`
- Loading skeleton mientras carga
- Empty state si no hay resultados: "No encontramos clínicas con esos filtros."

---

## Página `/marketplace/clinicas/[slug]`

- Carga: `GET /api/marketplace/clinics/[slug]`
- Muestra: nombre, descripción, especialidades, equipo de vets
- Si `blocked: true`: mostrar banner "Esta clínica no está disponible para ti" y deshabilitar CTA
- Si `blocked: false`: botón "Solicitar atención" (no funcional aún — se activa en C.4)
- Rating con estrellas y conteo

---

## Página `/marketplace/veterinarios`

- Carga inicial: `GET /api/marketplace/vets`
- Barra de búsqueda con `?q=...`
- Lista de `MarketplaceVetCard`
- Empty state si no hay resultados

---

## Verificación final

```bash
npx tsc --noEmit
npm run build
```

Navega manualmente:
- `/marketplace/clinicas` → debe cargar (aunque vacío)
- `/marketplace/veterinarios` → debe cargar
- Sin sesión → debe redirigir a login

Commit:
```bash
git add src/app/marketplace/ src/components/marketplace/
git commit -m "feat(C3): marketplace UI — clinicas, veterinarios, cards"
git push origin Develop
```

---

## Restricciones

- ❌ No implementar el botón "Solicitar atención" como funcional (es C.4)
- ❌ No usar hex hardcodeados — solo tokens `var(--pf-*)`
- ❌ No usar emoji como iconos
- ✅ Todos los estados: loading, empty, error
- ✅ Mobile-first para las páginas del marketplace
- ✅ `npx tsc --noEmit` después de cada componente
