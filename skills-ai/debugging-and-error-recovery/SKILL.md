---
name: debugging-and-error-recovery
description: Systematic root-cause debugging. Use when tests fail, builds break, or behavior doesn't match expectations.
---

# Debugging and Error Recovery

## The Stop-the-Line Rule

```
1. STOP adding features
2. PRESERVE evidence (PM2 logs, browser console, repro steps)
3. DIAGNOSE using the triage checklist
4. FIX the root cause (not the symptom)
5. GUARD against recurrence
6. RESUME after verification
```

## Petfhans-Specific Debug Commands

```bash
npx tsc --noEmit                          # TypeScript errors
npm run build 2>&1 | head -50            # Build errors
pm2 logs petfhans --err --lines 50 --nostream  # Runtime errors
curl http://localhost:3000/api/monitoring/health  # App alive?
pm2 status                               # Memory / restart count
```

## Supabase Silent Failures

Supabase returns `data: []` (not an error) when RLS blocks a row.
If a query returns unexpectedly empty results:

```typescript
// Always destructure error
const { data, error } = await supabase.from('pets').select('*').eq('id', petId)
if (error) {
  console.error('[route] Supabase error:', { code: error.code, msg: error.message })
  return NextResponse.json({ error: 'Error interno' }, { status: 500 })
}
if (!data || data.length === 0) {
  // Could be RLS block or missing clinic_id scope
  console.warn('[route] Empty result - check RLS and clinic_id scope')
}
```

## Triage Checklist

### Step 1: Reproduce
```
Can you reproduce the failure?
├── YES → Step 2
└── NO  → Gather PM2 logs, check env vars, try localhost vs production
```

### Step 2: Localize — Which Layer?
```
├── UI        → Browser console, React error boundary, Network tab
├── API       → PM2 logs, route handler return, Supabase response
├── DB/RLS    → Supabase Dashboard → Logs → RLS policies
├── Auth      → Middleware logic, cookie presence, subdomain detection
└── External  → Stripe webhook? OpenAI timeout? Resend bounce?
```

### Step 3: Fix Root Cause (Not Symptom)
```typescript
// SYMPTOM fix — hides the real problem
const pets = data ?? []  // silently swallows auth error

// ROOT CAUSE fix — investigate why data is null
if (error) console.error('[pets/list] RLS? missing clinic_id?', error)
```

### Step 4: Guard Against Recurrence
Add a test. Petfhans has zero tests — every bug fix is an opportunity.

### Step 5: Verify
```bash
npx tsc --noEmit && npm run build
curl http://localhost:3000/api/monitoring/health
```

## Common Error Patterns

```
TypeError: Cannot read properties of null
  → Supabase returned null — check RLS, use .maybeSingle() not .single()

Redirect loop to /auth/login
  → Middleware condition matches protected route — add console.log temporarily

500 in production only
  → Missing env var — every process.env.* needs a null check with throw

Build error: 'use client' boundary
  → Server Component importing a Client Component incorrectly
```

## Verification After Fix

- [ ] Root cause identified and in commit message
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Original bug scenario verified end-to-end
- [ ] Regression test added (or TODO filed)
