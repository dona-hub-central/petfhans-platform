import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

import AppointmentsCalendar from './AppointmentsCalendar'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id, role, clinic_id').eq('user_id', user.id).single()

  if (!profile?.clinic_id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--pf-ink)' }}>Sin clínica asignada</p>
        <p className="text-sm mt-2" style={{ color: 'var(--pf-muted)' }}>
          Tu cuenta no está vinculada a ninguna clínica. Contacta con el administrador.
        </p>
      </div>
    )
  }

  const isAdmin = profile.role === 'vet_admin' || profile.role === 'superadmin'

  // Citas del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // admin/vet_admin → todas las citas de la clínica
  // veterinarian    → mismas por ahora (vet_id en appointments requiere migración futura)
  const { data: appointments } = await admin.from('appointments')
    .select('*, pets(name, species), profiles(full_name, email)')
    .eq('clinic_id', profile.clinic_id)
    .gte('appointment_date', monthStart)
    .lte('appointment_date', monthEnd)
    .order('appointment_date').order('appointment_time')

  // Pendientes de hoy en adelante
  const { data: pending } = await admin.from('appointments')
    .select('*, pets(name, species), profiles(full_name, email)')
    .eq('clinic_id', profile.clinic_id)
    .eq('status', 'pending')
    .gte('appointment_date', now.toISOString().split('T')[0])
    .order('appointment_date').order('appointment_time')
    .limit(20)

  return (
    <>
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
        isAdmin={isAdmin}
      />
    </>
  )
}
