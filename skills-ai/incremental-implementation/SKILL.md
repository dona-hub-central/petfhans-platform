---
name: incremental-implementation
description: Delivers changes in thin vertical slices. Use when implementing any multi-file change, doing design system migration, refactoring layouts, or adding new pages. Every increment leaves the system in a working, testable state.
---

# Incremental Implementation

## The Increment Cycle

```
Implement → Test → Verify → Commit → Next slice
```

For each slice:
1. **Implement** smallest complete piece
2. **Test**: `npx tsc --noEmit` + `npm run build`
3. **Verify**: build clean, page loads correctly
4. **Commit**: one logical change per commit
5. **Next slice**

## Petfhans Slicing Examples

### Migrating to `layout.tsx`

```
❌ Wrong: Rewrite all 14 vet pages at once

✅ Right:
Slice 1: Create src/app/vet/layout.tsx → verify dashboard still loads
Slice 2: Remove VetLayout from dashboard/page.tsx → verify
Slice 3: Remove from pets/page.tsx → verify
... one page at a time, each committed separately
```

### Adding a new page (/vet/billing)

```
Slice 1: Route with placeholder → commit "feat: add /vet/billing route"
Slice 2: Supabase data fetching → commit
Slice 3: UI components → commit
Slice 4: Stripe portal CTA → commit
```

### Design system token migration

```
Slice 1: globals.css only → verify colors look identical
Slice 2: VetLayout.tsx → verify sidebar renders correctly
Slice 3: One component at a time
```

## Scope Discipline

Touch ONLY what the task requires. Do NOT:
- "Clean up" adjacent code while you're there
- Refactor imports in files you're not modifying
- Add features not in the spec
- Modernize syntax in files you're only reading

If you notice something worth improving outside scope, document it:
```
NOTICED BUT NOT TOUCHING:
- BookAppointment.tsx has 40 hardcoded hex values (separate task)
- PetGallery lightbox lacks aria-modal (tracked in navigation-fix.md)
```

## Rules

**Keep the app compilable between slices.** Never commit a slice that breaks the build.

**Feature flags for incomplete features:**
```typescript
const ENABLE_VET_SETTINGS = process.env.FEATURE_VET_SETTINGS === 'true'
// Don't add /vet/settings to sidebar nav until the page is complete
```

**One thing at a time:** Don't mix migrating token names AND adding new UI in the same commit.

## Increment Checklist

- [ ] One logical change, done completely
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Existing pages still load
- [ ] Committed with descriptive message

## Red Flags

- >100 lines written without running `tsc --noEmit`
- Multiple unrelated changes in one commit
- `"let me quickly add this too"` scope expansion
- Build broken between slices
- `globals.css` token changes + new UI in same PR
