---
name: api-and-interface-design
description: Guides stable API and interface design. Use when creating new API routes in src/app/api/, defining TypeScript types, establishing Supabase query contracts, or designing component props.
---

# API and Interface Design

## Petfhans API Route Template

Every route in `src/app/api/` must follow this structure:

```typescript
// src/app/api/vet/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// 1. Input schema
const CreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other']),
})

// 2. Output type
type CreateResponse = { pet: { id: string; name: string } }
type ErrorResponse  = { error: string; details?: unknown }

export async function POST(
  req: NextRequest
): Promise<NextResponse<CreateResponse | ErrorResponse>> {
  // 3. Auth first — always before data access
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // 4. Get clinic_id for ownership scoping
  const { data: profile } = await supabase
    .from('profiles').select('clinic_id, role').eq('user_id', user.id).single()
  if (!profile?.clinic_id)
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 403 })

  // 5. Validate input at the boundary
  const body = await req.json()
  const result = CreateSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json(
      { error: 'Datos inválidos', details: result.error.flatten() },
      { status: 422 }
    )

  // 6. Business logic — always scope to clinic_id
  const admin = createAdminClient()
  const { data: pet, error } = await admin
    .from('pets')
    .insert({ ...result.data, clinic_id: profile.clinic_id })
    .select('id, name').single()

  if (error || !pet) {
    console.error('[api/vet/pets/POST]', error)
    return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })
  }

  return NextResponse.json({ pet }, { status: 201 })
}
```

## Consistent Error Response Shape

```typescript
// ALL error responses follow this — no exceptions
type ErrorResponse = { error: string; details?: unknown }

// Status codes
// 401 → No session
// 403 → Wrong role or wrong clinic
// 404 → Resource not found
// 422 → Zod validation failed
// 429 → Rate limited (AI routes)
// 500 → Internal error (log internally, return generic message)
```

## Shared TypeScript Types

```typescript
// src/lib/types.ts — create this file if it doesn't exist
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
export type UserRole   = 'superadmin' | 'vet_admin' | 'veterinarian' | 'pet_owner'

export type Pet = {
  id: string; name: string; species: PetSpecies
  breed: string | null; birth_date: string | null
  weight: number | null; is_active: boolean
  clinic_id: string; photo_url: string | null; created_at: string
}

// Input type: no server-generated fields
export type CreatePetInput = {
  name: string; species: PetSpecies; breed?: string; birth_date?: string
}
```

## Supabase Query Result Typing

```typescript
// Type explicitly — never use any for query results
type PetWithRecords = Pet & {
  medical_records: Array<{ id: string; visit_date: string; reason: string }>
}

const { data, error } = await admin
  .from('pets')
  .select('*, medical_records(id, visit_date, reason)')
  .eq('id', petId)
  .eq('clinic_id', clinicId)  // ownership check — ALWAYS required
  .single()

const pet = data as PetWithRecords | null
```

## Pagination — Always on List Endpoints

```typescript
const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0'))
const pageSize = Math.min(50, parseInt(url.searchParams.get('pageSize') ?? '20'))

const { data, count } = await admin
  .from('pets').select('id, name, species', { count: 'exact' })
  .eq('clinic_id', clinicId).eq('is_active', true)
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .order('name', { ascending: true })

return NextResponse.json({
  data: data ?? [],
  pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
})
```

## Core Principles

**Validate at the boundary only.** Input validation belongs in API route handlers. Not inside `src/lib/` utility functions that receive already-typed data.

**Third-party responses are untrusted.** Validate Stripe webhook payloads and OpenAI responses before using them in any logic.

**Prefer addition over modification.** Add optional fields rather than changing or removing existing ones.

**Hyrum's Law.** Every observable API behavior becomes a dependency. Be intentional about what you expose.

## Red Flags

- Endpoints returning different shapes depending on conditions
- Missing `.eq('clinic_id', ...)` on admin client queries (IDOR risk)
- List endpoints without `.range()` pagination
- `any` for Supabase query results
- Input validation inside utility functions instead of at route handlers
- Error response exposing stack trace or Supabase error string

## Verification

- [ ] Typed input (Zod schema) and output for every new endpoint
- [ ] All error responses follow `{ error: string }` shape
- [ ] All list endpoints have `.range()` pagination
- [ ] `createAdminClient()` queries include `.eq('clinic_id', userClinicId)`
- [ ] `npx tsc --noEmit` passes with no `any` in new code
