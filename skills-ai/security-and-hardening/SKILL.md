---
name: security-and-hardening
description: Hardens code against vulnerabilities. Use when handling user input, authentication, data storage, or external integrations. Use when building any feature that accepts untrusted data, manages user sessions, or interacts with third-party services.
---

# Security and Hardening

## Overview

Security-first development practices for web applications. Treat every external input as hostile, every secret as sacred, and every authorization check as mandatory. Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

## When to Use

- Building anything that accepts user input
- Implementing authentication or authorization
- Storing or transmitting sensitive data
- Integrating with external APIs or services
- Adding file uploads, webhooks, or callbacks
- Handling payment or PII data

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary (API routes, form handlers)
- **Parameterize all database queries** — never concatenate user input into SQL
- **Encode output** to prevent XSS (use framework auto-escaping, don't bypass it)
- **Use HTTPS** for all external communication
- **Hash passwords** with bcrypt/scrypt/argon2 (never store plaintext)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run `npm audit`** (or equivalent) before every release

### Ask First (Requires Human Approval)

- Adding new authentication flows or changing auth logic
- Storing new categories of sensitive data (PII, payment info)
- Adding new external service integrations
- Changing CORS configuration
- Adding file upload handlers
- Modifying rate limiting or throttling
- Granting elevated permissions or roles

### Never Do

- **Never commit secrets** to version control (API keys, passwords, tokens)
- **Never log sensitive data** (passwords, tokens, full credit card numbers)
- **Never trust client-side validation** as a security boundary
- **Never disable security headers** for convenience
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in client-accessible storage** (localStorage for auth tokens)
- **Never expose stack traces** or internal error details to users

## Petfhans-Specific Security Rules

### Supabase client boundaries

```typescript
// createAdminClient() bypasses RLS entirely — NEVER in 'use client' files
// Only use in: src/app/api/*, Server Components that explicitly need admin access
import { createAdminClient } from '@/lib/supabase/admin'

// Always verify ownership before querying with admin client
const { data: pet } = await admin
  .from('pets')
  .select('*')
  .eq('id', pet_id)
  .eq('clinic_id', userClinicId) // ← MANDATORY ownership check
  .single()
```

### Environment variables

```typescript
// NEXT_PUBLIC_* vars are visible in the browser. Never put secrets here.
// ✅ Safe as NEXT_PUBLIC_: Supabase URL, Supabase anon key, Stripe publishable key
// ❌ Never NEXT_PUBLIC_: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, OPENAI_API_KEY

const key = process.env.STRIPE_SECRET_KEY
if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
```

### API route auth pattern

```typescript
// Every API route must verify auth + role explicitly
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient() // server client
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role === 'pet_owner') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // ... business logic using profile.clinic_id to scope queries
}
```

### File upload validation

```typescript
// Petfhans allows: images, PDFs, video — max 50MB (Nginx config)
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/quicktime',
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function validateUpload(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Archivo demasiado grande (máximo 50MB)')
  }
}
```

## OWASP Top 10 Prevention

### 1. Injection (SQL, NoSQL, OS Command)

```typescript
// BAD: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`

// GOOD: Supabase parameterizes automatically
const { data } = await supabase.from('users').select('*').eq('id', userId)
```

### 2. Broken Access Control

```typescript
// Always check that the authenticated user owns the resource
// BAD: trusts the client-sent pet_id without verification
const { data: pet } = await admin.from('pets').select('*').eq('id', body.pet_id).single()

// GOOD: scopes the query to the user's clinic
const { data: pet } = await admin
  .from('pets').select('*')
  .eq('id', body.pet_id)
  .eq('clinic_id', profile.clinic_id) // ownership check
  .single()
```

### 3. Cross-Site Scripting (XSS)

```typescript
// React auto-escapes by default — never bypass it
// BAD
element.innerHTML = userInput

// GOOD — React escapes automatically
return <div>{userInput}</div>

// If you MUST render HTML (e.g. markdown), sanitize first
import DOMPurify from 'isomorphic-dompurify'
const clean = DOMPurify.sanitize(userInput)
return <div dangerouslySetInnerHTML={{ __html: clean }} />
```

### 4. Sensitive Data Exposure

```typescript
// Never return sensitive fields in API responses
function sanitizeProfile(profile: ProfileRecord): PublicProfile {
  const { supabase_uid, raw_metadata, ...publicFields } = profile
  return publicFields
}

// Error responses must never expose internals
// BAD
return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })

// GOOD
console.error('[api/route]', err) // log internally
return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
```

## Input Validation with Zod

```typescript
import { z } from 'zod'

const CreatePetSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other']),
  breed: z.string().max(100).optional(),
  weight: z.number().positive().max(500).optional(),
  birth_date: z.string().datetime().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json()
  const result = CreatePetSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: result.error.flatten() },
      { status: 422 }
    )
  }

  // result.data is now typed and validated
}
```

## Rate Limiting for AI Routes

Las rutas `/api/vet/ai-chat` y `/api/agent/chat` llaman a OpenAI (costo por token). Verifica límites antes de cada llamada:

```typescript
// Pattern: check rate limit → call AI → log usage
const HOURLY_LIMIT = 20

const { count } = await admin
  .from('ai_usage_log')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', new Date(Date.now() - 3600_000).toISOString())

if ((count ?? 0) >= HOURLY_LIMIT) {
  return NextResponse.json(
    { error: 'Límite de consultas IA alcanzado. Intenta en una hora.' },
    { status: 429 }
  )
}
```

## Secrets Management

```
.env files:
  ├── .env.local.example  → Committed (template with placeholder values)
  └── .env.local          → NOT committed (contains real secrets)

.gitignore must include:
  .env.local
  .env.*.local
  *.pem
  *.key
```

**Always check before committing:**
```bash
git diff --cached | grep -iE "password|secret|api_key|token|sk_live|sk_test"
```

## See Also

`skills-ai/security-and-hardening/security-checklist.md` — pre-commit checklist and OWASP quick reference.
