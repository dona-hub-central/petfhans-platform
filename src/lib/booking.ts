/** Pure utilities for the booking wizard — no Supabase, no React, fully testable. */

export type BookingClinic = {
  id: string
  name: string
  allows_virtual: boolean
}

export type ClinicSchedule = {
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
  is_active: boolean
  slot_duration?: number
}

/**
 * Whether a clinic supports the requested modality.
 * Presential is always available; virtual requires explicit opt-in
 * (defaults true when the flag is absent so legacy clinics aren't excluded).
 */
export function allowsModality(clinic: BookingClinic, isVirtual: boolean): boolean {
  if (!isVirtual) return true
  return clinic.allows_virtual !== false
}

/**
 * Filter a list of clinics to those that support the chosen modality.
 */
export function filterClinicsForBooking(
  clinics: BookingClinic[],
  isVirtual: boolean,
): BookingClinic[] {
  return clinics.filter(c => allowsModality(c, isVirtual))
}

/**
 * Returns the minimum ISO date string a patient can select.
 * Urgent appointments allow today; programmed ones require tomorrow.
 */
export function buildMinDate(isUrgent: boolean): string {
  const d = new Date()
  if (!isUrgent) d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

/**
 * Checks whether a given HH:MM time falls within a clinic's schedule window.
 * If no checkTime is provided, returns true (date-only check — the clinic is
 * open on that day; slot availability is determined by the slots API).
 */
export function isTimeInSchedule(schedule: ClinicSchedule, checkTime?: string): boolean {
  if (!schedule.is_active) return false
  if (!checkTime) return true

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const check = toMinutes(checkTime)
  return check >= toMinutes(schedule.start_time) && check < toMinutes(schedule.end_time)
}

/**
 * Whether a clinic has at least one active schedule on the given day of week
 * (0 = Sunday … 6 = Saturday).
 */
export function clinicOpenOnDay(
  schedules: (ClinicSchedule & { day_of_week: number })[],
  dayOfWeek: number,
): boolean {
  return schedules.some(s => s.day_of_week === dayOfWeek && s.is_active)
}
