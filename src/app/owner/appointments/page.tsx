import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Video, MapPin, Plus } from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@/types'

export const metadata = { title: 'Mis citas · Petfhans' }

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',   color: '#b07800', bg: '#fff8e6' },
  confirmed: { label: 'Confirmada',  color: '#1a7a3c', bg: '#edfaf1' },
  cancelled: { label: 'Cancelada',   color: '#dc2626', bg: '#fef2f2' },
  completed: { label: 'Completada',  color: '#6b7280', bg: '#f3f4f6' },
}

type AppointmentRow = Appointment & {
  pets?: { name: string; species: string } | null
  clinics?: { name: string } | null
}

export default async function OwnerAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { new: newId } = await searchParams

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')
  const { data: rows } = await admin.from('appointments')
    .select('*, pets(name, species), clinics(name)')
    .eq('owner_id', profile.id)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })

  const appointments = (rows ?? []) as AppointmentRow[]
  const today = new Date().toISOString().split('T')[0]
  const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled')
  const past     = appointments.filter(a => a.appointment_date <  today || a.status === 'cancelled')

  return (
    <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 16px 24px', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: 'var(--pf-text-display)', margin: 0, color: 'var(--pf-ink)', fontSize: 26 }}>Mis citas</h1>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '4px 0 0' }}>
            {upcoming.length} próximas
          </p>
        </div>
        <Link href="/owner/appointments/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--pf-coral)', color: '#fff',
            textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>
          <Plus size={14} strokeWidth={2.5} />
          Nueva
        </Link>
      </header>

      {newId && (
        <div style={{
          background: '#edfaf1', border: '1px solid #86efac', borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, fontSize: 14,
          color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✓ Solicitud enviada. La clínica confirmará pronto tu cita.
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Próximas">
              {upcoming.map(a => <AppointmentCard key={a.id} a={a} highlight={a.id === newId} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Anteriores">
              {past.map(a => <AppointmentCard key={a.id} a={a} muted />)}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-muted)', margin: '0 0 10px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  )
}

function AppointmentCard({ a, muted = false, highlight = false }: { a: AppointmentRow; muted?: boolean; highlight?: boolean }) {
  const status = STATUS_LABEL[a.status]
  const date = new Date(a.appointment_date + 'T' + a.appointment_time)
  return (
    <div style={{
      background: 'var(--pf-white)', borderRadius: 14,
      border: highlight ? '1.5px solid var(--pf-coral)' : '0.5px solid var(--pf-border)',
      padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      opacity: muted ? 0.75 : 1,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {a.is_virtual ? <Video size={18} strokeWidth={1.75} /> : <Calendar size={18} strokeWidth={1.75} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{ font: 'var(--pf-text-body)', fontWeight: 600, color: 'var(--pf-ink)', margin: 0 }}>
            {a.pets?.name ?? 'Mascota'}
          </p>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: status.bg, color: status.color, fontWeight: 600,
          }}>{status.label}</span>
        </div>
        <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '3px 0 0' }}>
          {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · {a.appointment_time.slice(0, 5)}
        </p>
        {a.clinics?.name && (
          <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} strokeWidth={2} /> {a.clinics.name}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: 'var(--pf-white)', borderRadius: 20,
      border: '0.5px solid var(--pf-border)', padding: '48px 20px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-coral)' }}>
        <Calendar size={42} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 4px', fontFamily: 'var(--pf-font-display)' }}>
        Sin citas aún
      </p>
      <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 16px' }}>
        Pide tu primera consulta cuando quieras
      </p>
      <Link href="/owner/appointments/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--pf-coral)', color: '#fff',
          textDecoration: 'none', fontSize: 14, fontWeight: 600,
        }}>
        <Plus size={15} strokeWidth={2.5} /> Pedir cita
      </Link>
    </div>
  )
}
