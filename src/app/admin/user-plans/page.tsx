import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import UserPlansManager from './UserPlansManager'

export default async function UserPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const admin = createAdminClient()
  const { data: plans } = await admin.from('user_plans').select('*').order('sort_order').order('price_per_seat')

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Planes de usuario</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Define qué puede acceder cada tipo de usuario dentro de una clínica y su precio por asiento
          </p>
        </div>
        <UserPlansManager plans={plans ?? []} />
      </div>
    </AdminLayout>
  )
}
