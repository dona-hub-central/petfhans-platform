import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'
import AppointmentsCalendar from './AppointmentsCalendar'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()

  // Citas del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: appointments } = await admin.from('appointments')
    .select('*, pets(name, species), profiles!appointments_owner_id_fkey(full_name, email)')
    .eq('clinic_id', profile?.clinic_id)
    .gte('appointment_date', monthStart)
    .lte('appointment_date', monthEnd)
    .order('appointment_date').order('appointment_time')

  // Pendientes de hoy en adelante
  const { data: pending } = await admin.from('appointments')
    .select('*, pets(name, species), profiles!appointments_owner_id_fkey(full_name, email)')
    .eq('clinic_id', profile?.clinic_id)
    .eq('status', 'pending')
    .gte('appointment_date', now.toISOString().split('T')[0])
    .order('appointment_date').order('appointment_time')
    .limit(20)

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Citas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
            {pending?.length ?? 0} pendiente{pending?.length !== 1 ? 's' : ''} de confirmar
          </p>
        </div>
        <Link href="/vet/appointments/schedule" className="btn-pf px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <Settings size={14} strokeWidth={2} /> Configurar horario
        </Link>
      </div>

      <AppointmentsCalendar
        appointments={appointments ?? []}
        pending={pending ?? []}
        year={now.getFullYear()}
        month={now.getMonth()}
      />
    </VetLayout>
  )
}
