import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ensureProfile } from '@/lib/ensure-profile'
import SupportRequestForm from '@/components/shared/SupportRequestForm'

export const metadata = { title: 'Soporte · Petfhans' }

export default async function OwnerSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await ensureProfile(user)
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('full_name').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--pf-bg)', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="max-w-xl mx-auto">
        <SupportRequestForm
          defaultEmail={user.email ?? ''}
          defaultName={profile?.full_name ?? undefined}
          backHref="/owner/settings"
          backLabel="Volver al perfil"
        />
      </div>
    </div>
  )
}
