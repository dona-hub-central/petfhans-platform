import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingWizard from '../BookingWizard'

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...(props as Record<string, unknown>)}>{children}</a>
  ),
}))

// ─── fixtures ─────────────────────────────────────────────────────────────────

const PET_WITH_CLINIC = {
  id: 'pet-1', name: 'Nala', species: 'cat', breed: 'Siamés', clinic_id: 'clinic-1',
}
const PET_NO_CLINIC = {
  id: 'pet-2', name: 'Rex', species: 'dog', breed: null, clinic_id: null,
}
const CLINIC_VIRTUAL  = { id: 'clinic-1', name: 'Clínica Patas Sanas', allows_virtual: true }
const CLINIC_NO_VIRT  = { id: 'clinic-2', name: 'Clínica Sol',         allows_virtual: false }
const CLINICS_MAP     = { 'clinic-1': CLINIC_VIRTUAL }

// ─── render helpers ───────────────────────────────────────────────────────────

type TestPet = { id: string; name: string; species: string; breed: string | null; clinic_id: string | null }
type TestClinic = { id: string; name: string; allows_virtual: boolean }

/** Renders the wizard and navigates to the booking form; returns the container element. */
function reachForm(
  pet: TestPet = PET_WITH_CLINIC,
  clinics: Record<string, TestClinic> = CLINICS_MAP,
) {
  const { container } = render(<BookingWizard pets={[pet]} clinics={clinics} />)
  fireEvent.click(screen.getByText('Consulta programada'))
  fireEvent.click(screen.getByText('Presencial'))
  return container
}

/** Gets the date `<input type="date">` from the container. */
function getDateInput(container: Element) {
  return container.querySelector('input[type="date"]') as HTMLInputElement
}

/** Stubs `fetch` for one slots call then optionally one submit call. */
function stubFetch(slots: string[], apptId?: string) {
  const calls: Response[] = [
    { ok: true, json: async () => ({ slots }) } as Response,
  ]
  if (apptId !== undefined) {
    calls.push({ ok: true, json: async () => ({ appointment: { id: apptId } }) } as Response)
  }
  let idx = 0
  vi.stubGlobal('fetch', vi.fn(async () => calls[idx++] ?? calls.at(-1)!))
}

function stubFetchError(errorMsg = 'Error al solicitar cita') {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true,  json: async () => ({ slots: ['09:00'] }) } as Response)
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: errorMsg }) } as Response)
  )
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('BookingWizard', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

  // ── Fase 2: Flujo de navegación UI ─────────────────────────────────────────

  describe('pet selection step', () => {
    it('shows pet picker when multiple pets are provided', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC, PET_NO_CLINIC]} clinics={CLINICS_MAP} />)
      expect(screen.getByText('Nala')).toBeInTheDocument()
      expect(screen.getByText('Rex')).toBeInTheDocument()
    })

    it('skips pet selection with a single pet and shows type step', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      expect(screen.queryByText('¿Para qué mascota?')).not.toBeInTheDocument()
      expect(screen.getByText('¿Qué tipo de consulta?')).toBeInTheDocument()
    })

    it('shows empty-state when no pets exist', () => {
      render(<BookingWizard pets={[]} clinics={{}} />)
      expect(screen.getByText(/sin mascotas/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /añadir mascota/i }))
        .toHaveAttribute('href', '/owner/pets/new')
    })

    it('advances to type step when a pet card is clicked', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC, PET_NO_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Nala'))
      expect(screen.getByText('¿Qué tipo de consulta?')).toBeInTheDocument()
    })
  })

  describe('type selection step', () => {
    it('shows type options: Urgente and Consulta programada', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      expect(screen.getByText('Urgente')).toBeInTheDocument()
      expect(screen.getByText('Consulta programada')).toBeInTheDocument()
    })

    it('navigates to modality step when a type is chosen', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Consulta programada'))
      expect(screen.getByText('¿Cómo prefieres la consulta?')).toBeInTheDocument()
    })

    it('goes back to pet selection from type step when multiple pets', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC, PET_NO_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Nala'))
      fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
      expect(screen.getByText('¿Para qué mascota?')).toBeInTheDocument()
    })
  })

  describe('modality step', () => {
    it('shows Videollamada when clinic supports virtual', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Consulta programada'))
      expect(screen.getByText('Videollamada')).toBeInTheDocument()
    })

    // Caso A — videollamada oculta si la clínica no la soporta
    it('Caso A: hides Videollamada when allows_virtual=false', () => {
      render(
        <BookingWizard
          pets={[{ ...PET_WITH_CLINIC, clinic_id: 'clinic-2' }]}
          clinics={{ 'clinic-2': CLINIC_NO_VIRT }}
        />,
      )
      fireEvent.click(screen.getByText('Consulta programada'))
      expect(screen.queryByText('Videollamada')).not.toBeInTheDocument()
      expect(screen.getByText('Presencial')).toBeInTheDocument()
    })

    it('advances to form when Presencial is selected', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Consulta programada'))
      fireEvent.click(screen.getByText('Presencial'))
      expect(screen.getByText('Detalles de la cita')).toBeInTheDocument()
    })

    it('Atrás returns to type step', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Consulta programada'))
      fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
      expect(screen.getByText('¿Qué tipo de consulta?')).toBeInTheDocument()
    })
  })

  describe('booking form step', () => {
    it('shows the clinic name in the form subtitle', () => {
      reachForm()
      expect(screen.getByText(/Clínica Patas Sanas/)).toBeInTheDocument()
    })

    it('shows submit button disabled when form is incomplete', () => {
      reachForm()
      expect(screen.getByRole('button', { name: /solicitar cita/i })).toBeDisabled()
    })

    it('shows urgente badge when urgent type was selected', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      fireEvent.click(screen.getByText('Urgente'))
      fireEvent.click(screen.getByText('Presencial'))
      expect(screen.getByText(/consulta urgente/i)).toBeInTheDocument()
    })

    // Caso C — pet sin clínica muestra mensaje vacío + link al Marketplace interno
    it('Caso C/empty: shows no-clinic message with internal Marketplace link', () => {
      reachForm(PET_NO_CLINIC, {})
      expect(screen.getByText(/aún no está vinculada a ninguna clínica/i)).toBeInTheDocument()
      // Fase 2: verifica que NO redirige a URL estática externa
      const link = screen.getByRole('link', { name: /ir al marketplace/i })
      expect(link).toHaveAttribute('href', '/marketplace/clinicas')
      expect(link).not.toHaveAttribute('href', expect.stringContaining('clinicavet.petfhans.com'))
    })

    it('loads time slots when a date is selected', async () => {
      stubFetch(['09:00', '10:00'])
      const container = reachForm()

      fireEvent.change(getDateInput(container), { target: { value: '2026-05-20' } })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument()
      })
    })

    it('shows "Sin horarios disponibles" when slots API returns empty array', async () => {
      stubFetch([])
      const container = reachForm()

      fireEvent.change(getDateInput(container), { target: { value: '2026-05-20' } })

      await waitFor(() => {
        expect(screen.getByText(/sin horarios disponibles/i)).toBeInTheDocument()
      })
    })

    it('enables submit only after reason + date + time are all filled', async () => {
      stubFetch(['09:00'])
      const container = reachForm()

      fireEvent.change(
        screen.getByPlaceholderText(/describe el motivo/i),
        { target: { value: 'Revisión general' } },
      )
      fireEvent.change(getDateInput(container), { target: { value: '2026-05-20' } })

      await waitFor(() => screen.getByRole('button', { name: '09:00' }))
      fireEvent.click(screen.getByRole('button', { name: '09:00' }))

      expect(screen.getByRole('button', { name: /solicitar cita/i })).not.toBeDisabled()
    })

    it('shows API error message when submission fails', async () => {
      stubFetchError('Ese horario ya está reservado')
      const container = reachForm()

      fireEvent.change(
        screen.getByPlaceholderText(/describe el motivo/i),
        { target: { value: 'Revisión general' } },
      )
      fireEvent.change(getDateInput(container), { target: { value: '2026-05-20' } })

      await waitFor(() => screen.getByRole('button', { name: '09:00' }))
      fireEvent.click(screen.getByRole('button', { name: '09:00' }))
      fireEvent.click(screen.getByRole('button', { name: /solicitar cita/i }))

      await waitFor(() => {
        expect(screen.getByText('Ese horario ya está reservado')).toBeInTheDocument()
      })
    })
  })

  // ── Fase 3: Finalización y enrutamiento ────────────────────────────────────

  describe('success step and redirect', () => {
    async function completeBooking(container: Element, apptId = 'appt-42') {
      stubFetch(['10:00'], apptId)
      fireEvent.change(
        screen.getByPlaceholderText(/describe el motivo/i),
        { target: { value: 'Vacunación anual' } },
      )
      fireEvent.change(getDateInput(container), { target: { value: '2026-05-20' } })
      await waitFor(() => screen.getByRole('button', { name: '10:00' }))
      fireEvent.click(screen.getByRole('button', { name: '10:00' }))
      fireEvent.click(screen.getByRole('button', { name: /solicitar cita/i }))
      await waitFor(() => screen.getByText(/solicitud enviada/i))
    }

    it('shows success confirmation after appointment is created', async () => {
      const container = reachForm()
      await completeBooking(container)
      expect(screen.getByText(/solicitud enviada/i)).toBeInTheDocument()
      expect(screen.getByText(/te avisaremos/i)).toBeInTheDocument()
    })

    // Fase 3: redirige a /owner/appointments?new={id}
    it('Fase 3: redirects to /owner/appointments?new=<id> when "Ver historial" is clicked', async () => {
      const container = reachForm()
      await completeBooking(container, 'appt-42')

      fireEvent.click(screen.getByRole('button', { name: /ver historial/i }))

      expect(mockPush).toHaveBeenCalledWith('/owner/appointments?new=appt-42')
    })

    // Fase 3: nueva cita aparece en historial — ruta recibe el query param ?new=
    it('Fase 3: redirect URL includes the new appointment id for highlighting', async () => {
      const container = reachForm()
      await completeBooking(container, 'appt-99')

      fireEvent.click(screen.getByRole('button', { name: /ver historial/i }))

      const [calledWith] = mockPush.mock.calls[0] as [string]
      expect(calledWith).toContain('?new=appt-99')
    })

    // Fase 2: el wizard nunca redirige a la URL estática antigua
    it('Fase 2: wizard renders internal flow — no external static URL in the tree', () => {
      render(<BookingWizard pets={[PET_WITH_CLINIC]} clinics={CLINICS_MAP} />)
      const allLinks = screen.queryAllByRole('link')
      for (const link of allLinks) {
        expect(link).not.toHaveAttribute('href', expect.stringContaining('clinicavet.petfhans.com'))
      }
    })
  })
})
