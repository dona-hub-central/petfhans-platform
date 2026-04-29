import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import TiersManager from './TiersManager'

export default async function TiersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const { data: tiers } = await admin
    .from('clinic_tiers').select('*').order('sort_order').order('min_patients')

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Tarifas por tramos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
            Define el precio según el número de pacientes de cada clínica
          </p>
        </div>
        <TiersManager tiers={tiers ?? []} />
      </div>
    </AdminLayout>
  )
}
