---
name: test-driven-development
description: Drives development with tests. Petfhans currently has zero tests. Use when implementing logic, fixing bugs, or changing behavior. Every new feature and bug fix is an opportunity to start.
---

# Test-Driven Development

## Overview

Write a failing test before writing the code that makes it pass. For bug fixes, reproduce the bug with a test first. Tests are proof — "seems right" is not done.

**Petfhans status:** Zero tests exist. Priority order for starting:
1. Utility functions in `src/lib/`
2. Business logic: plan limits, invitation validation
3. API route auth guards (mocked Supabase)
4. Component rendering (React Testing Library)

## Setup (First Time)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, alias: { '@': './src' } },
})
```

```json
// package.json scripts
"test": "vitest",
"test:run": "vitest run"
```

## The TDD Cycle

```
RED: Write failing test → GREEN: Minimal code to pass → REFACTOR: Clean up
```

## Petfhans Test Patterns

### Pure utility (no mocks needed)

```typescript
// src/lib/__tests__/plan-limits.test.ts
import { describe, it, expect } from 'vitest'

function canAddPet(count: number, max: number): boolean {
  return count < max
}
function usageLevel(count: number, max: number): 'ok' | 'warning' | 'blocked' {
  const pct = count / max
  if (pct >= 1) return 'blocked'
  if (pct >= 0.8) return 'warning'
  return 'ok'
}

describe('plan limits', () => {
  it('blocks adding pets when at limit', () => {
    expect(canAddPet(50, 50)).toBe(false)
    expect(canAddPet(49, 50)).toBe(true)
  })
  it('shows warning at 80% usage', () => {
    expect(usageLevel(40, 50)).toBe('warning')
    expect(usageLevel(39, 50)).toBe('ok')
    expect(usageLevel(50, 50)).toBe('blocked')
  })
})
```

### API route (mocked Supabase)

```typescript
// src/app/api/vet/pets/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }))
}))

describe('GET /api/vet/pets', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/vet/pets')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
```

## The Prove-It Pattern (Bug Fixes)

```
Bug report → Write reproduction test (FAILS) → Fix bug → Test PASSES → Run suite
```

Never start a fix before you have a failing test that confirms the bug.

## Writing Good Tests

```typescript
// DAMP over DRY: each test tells a complete story
it('rejects pet creation when clinic is at patient limit', () => {
  expect(canAddPet(50, 50)).toBe(false)
})

// Test state/behavior, not implementation
it('returns 401 when not authenticated') // test the HTTP status, not which Supabase method was called

// One concept per test
it('rejects empty names')
it('trims whitespace from names')
it('enforces maximum name length')
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll write tests after the code works" | You won't. Tests written after test implementation, not behavior. |
| "Petfhans is too complex to test now" | Start with one pure function. One test is better than zero. |
| "Manual testing is enough" | Manual tests don't persist. Tomorrow's change breaks them silently. |

## Verification

- [ ] `npm test` runs and passes
- [ ] Every new behavior has a corresponding test
- [ ] Bug fixes include a reproduction test that failed before the fix
- [ ] Test names describe the behavior: `it('returns 401 when not authenticated')`
- [ ] No tests skipped or disabled
