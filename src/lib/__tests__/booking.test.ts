import { describe, it, expect } from 'vitest'
import {
  allowsModality,
  filterClinicsForBooking,
  buildMinDate,
  isTimeInSchedule,
  clinicOpenOnDay,
  type BookingClinic,
} from '../booking'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CLINIC_VIRTUAL: BookingClinic  = { id: 'a', name: 'Virtual y Presencial', allows_virtual: true }
const CLINIC_NO_VIRT: BookingClinic  = { id: 'b', name: 'Solo Presencial',      allows_virtual: false }
const CLINIC_BOTH_OK: BookingClinic  = { id: 'c', name: 'También Virtual',      allows_virtual: true }

const SCHEDULE_ACTIVE = { start_time: '09:00', end_time: '18:00', is_active: true }
const SCHEDULE_CLOSED = { start_time: '09:00', end_time: '18:00', is_active: false }

// ─────────────────────────────────────────────────────────────────────────────
// allowsModality
// ─────────────────────────────────────────────────────────────────────────────

describe('allowsModality', () => {
  it('always allows presential regardless of virtual flag', () => {
    expect(allowsModality(CLINIC_VIRTUAL,  false)).toBe(true)
    expect(allowsModality(CLINIC_NO_VIRT,  false)).toBe(true)
  })

  it('allows virtual when clinic has allows_virtual=true', () => {
    expect(allowsModality(CLINIC_VIRTUAL, true)).toBe(true)
  })

  // Caso A — clínica con virtual=false debe ser excluida en búsquedas virtuales
  it('Caso A: rejects virtual when allows_virtual=false', () => {
    expect(allowsModality(CLINIC_NO_VIRT, true)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filterClinicsForBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('filterClinicsForBooking', () => {
  const ALL = [CLINIC_VIRTUAL, CLINIC_NO_VIRT, CLINIC_BOTH_OK]

  it('returns all clinics for presential search', () => {
    expect(filterClinicsForBooking(ALL, false)).toHaveLength(3)
  })

  // Caso A — filtro estricto virtual
  it('Caso A: excludes clinics with allows_virtual=false in virtual search', () => {
    const result = filterClinicsForBooking(ALL, true)
    expect(result).toHaveLength(2)
    expect(result.find(c => c.id === 'b')).toBeUndefined()
  })

  // Caso C — la clínica correcta SÍ aparece cuando cumple las condiciones
  it('Caso C: includes all qualifying clinics in the result', () => {
    const result = filterClinicsForBooking(ALL, true)
    expect(result.map(c => c.id)).toEqual(expect.arrayContaining(['a', 'c']))
  })

  it('returns empty array when no clinic supports the requested modality', () => {
    const onlyPresential = [CLINIC_NO_VIRT]
    expect(filterClinicsForBooking(onlyPresential, true)).toHaveLength(0)
  })

  it('treats undefined allows_virtual as true (legacy clinics stay visible)', () => {
    const legacy = { id: 'x', name: 'Legacy', allows_virtual: true }
    expect(filterClinicsForBooking([legacy], true)).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildMinDate
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMinDate', () => {
  it('returns today for urgent appointments', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(buildMinDate(true)).toBe(today)
  })

  it('returns tomorrow for programmed appointments', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(buildMinDate(false)).toBe(tomorrow.toISOString().split('T')[0])
  })

  it('urgent and programmed min dates are different', () => {
    expect(buildMinDate(true)).not.toBe(buildMinDate(false))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isTimeInSchedule
// ─────────────────────────────────────────────────────────────────────────────

describe('isTimeInSchedule', () => {
  it('returns false for inactive schedules regardless of time', () => {
    expect(isTimeInSchedule(SCHEDULE_CLOSED, '10:00')).toBe(false)
    expect(isTimeInSchedule(SCHEDULE_CLOSED)).toBe(false)
  })

  it('returns true when no time provided (date-only availability check)', () => {
    expect(isTimeInSchedule(SCHEDULE_ACTIVE)).toBe(true)
  })

  // Caso B — el horario excluye tiempos fuera del rango
  it('Caso B: rejects time before schedule start', () => {
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '08:59')).toBe(false)
  })

  it('Caso B: rejects time at or after schedule end', () => {
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '18:00')).toBe(false)
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '19:30')).toBe(false)
  })

  it('Caso B: accepts time exactly at schedule start', () => {
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '09:00')).toBe(true)
  })

  // Caso C — la clínica correcta SÍ está disponible cuando el horario coincide
  it('Caso C: accepts time within schedule window', () => {
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '14:00')).toBe(true)
    expect(isTimeInSchedule(SCHEDULE_ACTIVE, '17:59')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// clinicOpenOnDay
// ─────────────────────────────────────────────────────────────────────────────

describe('clinicOpenOnDay', () => {
  const schedules = [
    { start_time: '09:00', end_time: '18:00', is_active: true,  day_of_week: 1 }, // Mon
    { start_time: '09:00', end_time: '14:00', is_active: true,  day_of_week: 6 }, // Sat
    { start_time: '09:00', end_time: '18:00', is_active: false, day_of_week: 0 }, // Sun (closed)
  ]

  it('returns true when the clinic has an active schedule on that day', () => {
    expect(clinicOpenOnDay(schedules, 1)).toBe(true) // Monday
    expect(clinicOpenOnDay(schedules, 6)).toBe(true) // Saturday
  })

  // Caso B — excluir clínicas cuyo horario no coincide con la fecha seleccionada
  it('Caso B: returns false when schedule exists but is inactive', () => {
    expect(clinicOpenOnDay(schedules, 0)).toBe(false) // Sunday disabled
  })

  it('Caso B: returns false when no schedule exists for that day', () => {
    expect(clinicOpenOnDay(schedules, 2)).toBe(false) // Tuesday — no schedule
  })
})
