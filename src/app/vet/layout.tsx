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
    .select('full_name, role, avatar_url, clinics(name)')
    .eq('user_id', user.id)
    .single()

  type ProfileRow = { full_name: string | null; role: string; avatar_url: string | null; clinics: { name: string } | null }
  const clinicName = (profile as ProfileRow | null)?.clinics?.name ?? ''
  const userName = profile?.full_name ?? ''

  return (
    <VetLayout
      clinicName={clinicName}
      userName={userName}
      avatarUrl={profile?.avatar_url}
      role={profile?.role}
    >
      {children}
    </VetLayout>
  )
}
