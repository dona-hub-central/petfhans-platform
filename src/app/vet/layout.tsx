import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'

export default async function VetSegmentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, clinics(name)')
    .eq('user_id', user.id)
    .single()

  const clinicName = (profile as any)?.clinics?.name ?? ''
  const userName = profile?.full_name ?? ''

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      {children}
    </VetLayout>
  )
}
