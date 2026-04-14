import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import PlansEditor from './PlansEditor'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const admin = createAdminClient()
  const { data: plans } = await admin.from('subscription_plans').select('*').order('price_monthly')

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Planes de suscripción</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Define precios, límites y características de cada plan</p>
        </div>
        <PlansEditor plans={plans ?? []} />
      </div>
    </AdminLayout>
  )
}
