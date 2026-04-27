import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'

export default async function VetSegmentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('user_id', user.id)
    .single()

  const { data: clinicLink } = await admin
    .from('profile_clinics')
    .select('clinics(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  type ClinicRow = { name: string }
  const clinic = (clinicLink?.clinics as unknown as ClinicRow | null)
  const clinicName = clinic?.name ?? ''
  const hasClinic = !!clinic
  const userName = profile?.full_name ?? ''

  return (
    <VetLayout
      clinicName={clinicName}
      userName={userName}
      avatarUrl={profile?.avatar_url}
      role={profile?.role}
      hasClinic={hasClinic}
    >
      {children}
    </VetLayout>
  )
}
