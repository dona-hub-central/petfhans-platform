import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OwnerBottomNav from '@/components/owner/OwnerBottomNav'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Block non-owner roles from the owner segment.
  const { data: profile } = await supabase.from('profiles')
    .select('role').eq('user_id', user.id).single()
  if (profile?.role === 'superadmin') redirect('/admin')
  if (['vet_admin', 'veterinarian'].includes(profile?.role ?? '')) redirect('/vet/dashboard')

  return (
    <>
      <div className="pf-own-page">{children}</div>
      <OwnerBottomNav />
      <style>{`
        @media (max-width: 767px) {
          .pf-own-page { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </>
  )
}
