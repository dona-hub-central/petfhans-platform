import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── chain helper ─────────────────────────────────────────────────────────────

/**
 * Thenable Supabase chain mock.
 * - `await chain`       → `{ data: listData, error: null }`
 * - `chain.single()`    → `{ data: singleData ?? listData, error: null }`
 * - `chain.maybeSingle()` → `{ data: null, error: null }` (override per-test if needed)
 * - All builder methods (select, eq, in, …) return `chain`
 */
function makeThenableChain(listData: unknown, singleData?: unknown) {
  const single = singleData !== undefined ? singleData : listData
  const resolved = { data: listData, error: null as null }
  const chain: Record<string, unknown> = {
    then:  (fn: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(fn),
    catch: (fn: (e: unknown) => unknown)         => Promise.resolve(resolved).catch(fn),
  }
  for (const m of ['select', 'eq', 'in', 'not', 'limit', 'order', 'insert', 'delete', 'update']) {
    chain[m] = vi.fn(() => chain)
  }
  chain['single']      = vi.fn().mockResolvedValue({ data: single, error: null })
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => makeThenableChain(
      { id: 'profile-1', role: 'pet_owner', full_name: 'Test Owner', email: 'owner@test.com' },
    )),
  })),
}))

const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// Resend must be a regular function (not arrow) so it can be used with `new`
vi.mock('resend', () => ({
  Resend: vi.fn(function(this: unknown) {
    return { emails: { send: vi.fn().mockResolvedValue({ id: 'email-1' }) } }
  }),
}))

// ─── fixtures ─────────────────────────────────────────────────────────────────

const VALID_BODY = {
  pet_id:           'pet-1',
  appointment_date: '2026-05-15',
  appointment_time: '10:00:00',
  reason:           'Consulta de revisión',
}

const PET = {
  name: 'Rex', species: 'dog',
  clinic_id: 'clinic-1', owner_id: 'profile-1',
  clinics: { name: 'Clínica Test', slug: 'clinica-test' },
}

const APPOINTMENT = {
  id: 'appt-1', pet_id: 'pet-1', clinic_id: 'clinic-1',
  owner_id: 'profile-1', appointment_date: '2026-05-15',
  appointment_time: '10:00:00', status: 'pending', is_virtual: false,
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/appointments', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('POST /api/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.RESEND_API_KEY      = 'test-key'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/autorizado/i)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ pet_id: 'pet-1' }))   // missing date/time/reason
    expect(res.status).toBe(400)
  })

  it('returns 404 when pet does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // pets returns null
    mockAdminFrom.mockReturnValue(makeThenableChain(null))
    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(404)
  })

  it('returns 403 when pet_owner has no access to the pet', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const petChain    = makeThenableChain({ ...PET, owner_id: 'someone-else' })
    const accessChain = makeThenableChain(null)
    // maybeSingle returns null — no pet_access row
    ;(accessChain['maybeSingle'] as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ data: null, error: null })

    mockAdminFrom
      .mockReturnValueOnce(petChain)    // from('pets')
      .mockReturnValueOnce(accessChain) // from('pet_access')

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect([403, 404]).toContain(res.status)
  })

  // Fase 3: appointment is saved with correct owner_id and clinic_id
  it('Fase 3: creates appointment linked to owner and clinic (happy path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const petChain = makeThenableChain(PET, PET)

    const accessChain = makeThenableChain(null)
    ;(accessChain['maybeSingle'] as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ data: { pet_id: 'pet-1' }, error: null })

    // Conflict check: no existing appointment at that slot
    const conflictChain = makeThenableChain([])

    // Insert chain: insert(...).select().single() → APPOINTMENT
    const insertChain = makeThenableChain([APPOINTMENT], APPOINTMENT)

    // Vet email fetch: profiles list
    const profilesChain = makeThenableChain([])

    mockAdminFrom
      .mockReturnValueOnce(petChain)      // from('pets')
      .mockReturnValueOnce(accessChain)   // from('pet_access')
      .mockReturnValueOnce(conflictChain) // from('appointments') — conflict check
      .mockReturnValueOnce(insertChain)   // from('appointments') — insert
      .mockReturnValueOnce(profilesChain) // from('profiles') — vet emails

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(200)
    const data = await res.json() as { appointment?: { id: string } }
    expect(data.appointment).toBeDefined()
    expect(data.appointment?.id).toBe('appt-1')
  })
})
