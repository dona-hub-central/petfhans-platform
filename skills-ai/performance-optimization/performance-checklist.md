# Performance Checklist — Petfhans

Quick reference. Use alongside `skills-ai/performance-optimization/SKILL.md`.

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Before Shipping Any New Feature

### Database queries
- [ ] No N+1 patterns — no loops calling `supabase.from()` per item
- [ ] List queries use `.range(offset, offset + PAGE_SIZE - 1)` (never unbounded)
- [ ] Joined data uses Supabase `select('*, relation(*)')` instead of multiple queries
- [ ] Signed URLs use `createSignedUrls` (plural, single request)

### Images
- [ ] New `<img>` tags replaced with `next/image` (`<Image>`)
- [ ] `width` and `height` always specified to prevent CLS
- [ ] LCP images use `priority` prop (`fetchpriority="high"`)
- [ ] Below-fold images omit `priority` (lazy load by default in next/image)

### JavaScript
- [ ] Heavy features imported with `dynamic(() => import(...))` if not needed on first load
- [ ] `React.memo` only on components with proven re-render issues
- [ ] No `useMemo` / `useCallback` without profiling evidence

### API Routes
- [ ] Responses that change rarely have `Cache-Control` headers
- [ ] Error responses never expose stack traces or internal error strings
- [ ] AI routes have rate limiting before calling OpenAI

### Fonts
- [ ] Fonts loaded via `next/font/google`, not `<link>` or CSS `@import`

## Measurement Commands

```bash
# Lighthouse
npx lighthouse http://localhost:3000/vet/dashboard --output json

# Bundle analysis
npx @next/bundle-analyzer

# Check for slow Supabase queries
# → Supabase Dashboard → Database → Query Performance

# Web Vitals in code (add to root layout temporarily)
import { onLCP, onINP, onCLS } from 'web-vitals'
onLCP(console.log)
onINP(console.log)
onCLS(console.log)
```

## Common Anti-Patterns

| Anti-Pattern | Impact | Fix |
|---|---|---|
| N+1 Supabase calls | Linear latency growth | Use joins or `IN` queries |
| N signed URL calls | N×storage round-trips | Use `createSignedUrls` |
| Unbounded queries | Memory exhaustion | Always paginate |
| `<img>` instead of `<Image>` | CLS, no WebP, no lazy | Migrate to next/image |
| Google Fonts `<link>` | Render-blocking, double load | Use `next/font/google` |
| Usage fetch without cache | Redundant DB hit per nav | Add `Cache-Control` header |
| `React.memo` everywhere | False security, adds overhead | Only where profiling shows need |
