import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * A chain mock that is properly thenable:
 * - `await chain` resolves to `{ data: listData, error: null }`
 * - `.single()` resolves to `{ data: listData, error: null }`
 * - `.maybeSingle()` resolves to `{ data: null, error: null }`
 * - All builder methods (select, eq, …) return `this`
 */
function makeThenableChain(listData: unknown) {
  const resolved = { data: listData, error: null as null }
  const chain: Record<string, unknown> = {
    then:  (fn: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(fn),
    catch: (fn: (e: unknown) => unknown)         => Promise.resolve(resolved).catch(fn),
  }
  for (const m of ['select', 'eq', 'in', 'not', 'limit', 'order', 'insert', 'delete', 'update']) {
    chain[m] = vi.fn(() => chain)
  }
  chain['single']      = vi.fn().mockResolvedValue(resolved)
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))

const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// ─── test helpers ─────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/appointments/slots')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

// Monday schedule 09:00–12:00 at 30-min intervals → slots: 09:00 09:30 10:00 10:30 11:00 11:30
const MONDAY_SCHEDULE = [{
  id: 's-1', clinic_id: 'c-1', day_of_week: 1,
  start_time: '09:00', end_time: '12:00', slot_duration: 30, is_active: true,
}]

// ─── tests ────────────────────────────────────────────────────────────────────

describe('GET /api/appointments/slots', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('../route')
    const res = await GET(makeRequest({ clinic_id: 'c-1', date: '2026-05-12' }))
    expect(res.status).toBe(401)
  })

  it('returns empty slots when date param is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    const { GET } = await import('../route')
    const res = await GET(makeRequest({ clinic_id: 'c-1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { slots: string[] }
    expect(body.slots).toHaveLength(0)
  })

  it('returns empty slots when clinic has no schedule for that day', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })

    // clinic_schedules returns an empty array
    mockAdminFrom.mockReturnValue(makeThenableChain([]))

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ clinic_id: 'c-1', date: '2026-05-11' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { slots: string[] }
    expect(body.slots).toHaveLength(0)
  })

  // Caso B/fix — pet_owner can now access slots (profile_clinics restriction removed)
  it('Caso B/fix: returns slots for any authenticated user (no clinic-link check)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })

    // First call → clinic_schedules: returns schedule
    // Second call → appointments: returns [] (no booked slots)
    mockAdminFrom
      .mockReturnValueOnce(makeThenableChain(MONDAY_SCHEDULE))
      .mockReturnValueOnce(makeThenableChain([]))

    const { GET } = await import('../route')
    // 2026-05-11 is a Monday (day_of_week = 1)
    const res = await GET(makeRequest({ clinic_id: 'c-1', date: '2026-05-11' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { slots: unknown }
    expect(body).toHaveProperty('slots')
    expect(Array.isArray(body.slots)).toBe(true)
  })
})
