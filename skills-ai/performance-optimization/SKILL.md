---
name: performance-optimization
description: Optimizes application performance. Use when performance requirements exist, when you suspect performance regressions, or when Core Web Vitals or load times need improvement. Use when profiling reveals bottlenecks that need fixing.
---

# Performance Optimization

## Overview

Measure before optimizing. Performance work without measurement is guessing — and guessing leads to premature optimization that adds complexity without improving what matters. Profile first, identify the actual bottleneck, fix it, measure again.

## When to Use

- Performance requirements exist in the spec (load time budgets, response time SLAs)
- Users or monitoring report slow behavior
- Core Web Vitals scores are below thresholds
- You suspect a change introduced a regression
- Building features that handle large datasets or high traffic

**When NOT to use:** Don't optimize before you have evidence of a problem.

## Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Petfhans-Specific Performance Rules

### Known bottlenecks to avoid

**N+1 queries — never loop individual Supabase calls:**

```typescript
// ❌ BAD — N round-trips to Supabase (one per pet)
const petsWithInfo = await Promise.all(pets.map(async (pet) => {
  const { data: next } = await admin
    .from('medical_records')
    .select('next_visit')
    .eq('pet_id', pet.id)
    .order('visit_date', { ascending: false })
    .limit(1)
    .single()
  return { ...pet, nextVisit: next?.next_visit }
}))

// ✅ GOOD — single query with join
const { data: pets } = await admin
  .from('pets')
  .select(`
    *,
    medical_records(
      next_visit,
      visit_date
    )
  `)
  .eq('clinic_id', clinicId)
  .eq('is_active', true)
  .order('visit_date', { ascending: false, foreignTable: 'medical_records' })
  .limit(1, { foreignTable: 'medical_records' })
```

**Signed URLs — use the plural batch method:**

```typescript
// ❌ BAD — one request to Supabase Storage per file
const photosWithUrls = await Promise.all(photos.map(async (f) => {
  const { data } = await admin.storage
    .from('pet-files')
    .createSignedUrl(f.file_path, 3600 * 24)
  return { ...f, publicUrl: data?.signedUrl ?? '' }
}))

// ✅ GOOD — single request for all files
const { data: signedUrls } = await admin.storage
  .from('pet-files')
  .createSignedUrls(photos.map(f => f.file_path), 3600 * 24)

const photosWithUrls = photos.map((f, i) => ({
  ...f,
  publicUrl: signedUrls?.[i]?.signedUrl ?? '',
}))
```

**VetLayout usage fetch — cache it:**

```typescript
// The usage fetch in VetLayout runs on every sidebar mount
// Add cache headers on the API route side:
export async function GET(): Promise<NextResponse> {
  // ... fetch usage data
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=60' }, // 1 minute cache
  })
}
```

**Fonts — use next/font instead of Google Fonts link:**

```typescript
// ❌ BAD — external round-trip, render-blocking
// <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" />

// ✅ GOOD — next/font optimizes, self-hosts, zero layout shift
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--pf-font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--pf-font-body',
  display: 'swap',
})
```

**Images — use next/image:**

```tsx
// ❌ BAD — no optimization, no lazy load, CLS risk
<img src={pet.photo_url} alt={pet.name} />

// ✅ GOOD — WebP/AVIF conversion, lazy load, CLS prevention
import Image from 'next/image'
<Image
  src={pet.photo_url}
  alt={pet.name}
  width={80}
  height={80}
  className="rounded-lg object-cover"
/>
```

## The Optimization Workflow

```
1. MEASURE  → Establish baseline with real data
2. IDENTIFY → Find the actual bottleneck (not assumed)
3. FIX      → Address the specific bottleneck
4. VERIFY   → Measure again, confirm improvement
5. GUARD    → Add monitoring or tests to prevent regression
```

## Where to Start Measuring

```
What is slow?
├── First page load
│   ├── Large bundle? → Check code splitting, dynamic imports
│   ├── Slow server response? → Check Supabase query times in logs
│   └── Render-blocking? → Check network waterfall for CSS/JS blocking
├── Interaction feels sluggish
│   ├── UI freezes? → Profile main thread, look for long tasks >50ms
│   └── Re-renders? → React DevTools Profiler
└── API slow?
    ├── Single endpoint? → Check Supabase query with .explain()
    └── All endpoints? → Check middleware double-query pattern
```

## Common Anti-Patterns in This Codebase

| Anti-Pattern | Location | Fix |
|---|---|---|
| N+1 signed URLs | `owner/pets/[id]/page.tsx` | Use `createSignedUrls` (plural) |
| N+1 next visit queries | `owner/dashboard/page.tsx` | Single join query |
| Font double-load | `layout.tsx` + `globals.css` | Use `next/font/google` |
| `<img>` without next/image | VetLayout, PetAvatar, PetGallery | Migrate to `<Image>` |
| Usage fetch without cache | VetLayout useEffect | Add `Cache-Control: private, max-age=60` |
| No pagination in list pages | `/vet/pets`, `/vet/records` | Add `.range(offset, offset+19)` |

## Unbounded Data Fetching

Always paginate list queries. Never fetch all rows:

```typescript
// ❌ BAD — fetches all pets, memory exhaustion at scale
const { data: pets } = await admin.from('pets').select('*').eq('clinic_id', id)

// ✅ GOOD — paginated
const PAGE_SIZE = 20
const { data: pets } = await admin
  .from('pets')
  .select('*')
  .eq('clinic_id', id)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('name', { ascending: true })
```

## React Performance

```tsx
// Use React.memo for expensive components that re-render with same props
const PetCard = React.memo(function PetCard({ pet }: PetCardProps) {
  return <div>{/* expensive render */}</div>
})

// useMemo only where profiling shows benefit — don't use it everywhere
const sortedPets = useMemo(
  () => pets.sort((a, b) => a.name.localeCompare(b.name)),
  [pets]
)

// Stable references prevent unnecessary re-renders
const DEFAULT_FILTERS = { species: 'all', sortBy: 'name' } as const
// Move this outside the component, not inside
```

## See Also

`skills-ai/performance-optimization/performance-checklist.md` — measurement commands and anti-pattern quick reference.
