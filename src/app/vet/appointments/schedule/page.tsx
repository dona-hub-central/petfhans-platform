import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'
import ScheduleEditor from './ScheduleEditor'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: schedules } = await admin.from('clinic_schedules')
    .select('*').eq('clinic_id', profile?.clinic_id).order('day_of_week').order('start_time')

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <a href="/vet/appointments" className="text-xs" style={{ color: 'var(--muted)' }}>← Citas</a>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Configurar horario</span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Horario de disponibilidad</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Define los días y horas en que los dueños pueden solicitar citas
        </p>
        <ScheduleEditor schedules={schedules ?? []} clinicId={profile?.clinic_id ?? ''} />
      </div>
    </VetLayout>
  )
}
