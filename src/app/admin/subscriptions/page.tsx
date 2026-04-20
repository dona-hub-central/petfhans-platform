import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import SubscriptionManager from './SubscriptionManager'

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const admin = createAdminClient()

  const [{ data: clinics }, { data: allUsers }] = await Promise.all([
    admin.from('clinics')
      .select('id, name, slug, subscription_plan, subscription_status, max_patients, stripe_customer_id, stripe_subscription_id, created_at')
      .order('name'),
    admin.from('profiles')
      .select('id, full_name, email, role, clinic_id, created_at')
      .in('role', ['vet_admin', 'veterinarian'])
      .order('full_name'),
  ])

  // Agrupar usuarios por clínica
  const usersByClinic = (allUsers ?? []).reduce((acc: Record<string, any[]>, u) => {
    if (u.clinic_id) {
      if (!acc[u.clinic_id]) acc[u.clinic_id] = []
      acc[u.clinic_id].push(u)
    }
    return acc
  }, {})

  const clinicsWithUsers = (clinics ?? []).map(c => ({
    ...c,
    users: usersByClinic[c.id] ?? []
  }))

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Suscripciones</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Planes activos y usuarios por clínica</p>
          </div>
          <a href="/admin/plans" className="text-sm font-medium px-4 py-2 rounded-xl border"
            style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-coral)' }}>
            ⚙️ Configurar planes
          </a>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Trial', value: clinics?.filter(c => c.subscription_plan === 'trial').length ?? 0, bg: '#f3f4f6', color: '#6b7280' },
            { label: 'Basic', value: clinics?.filter(c => c.subscription_plan === 'basic').length ?? 0, bg: '#eff6ff', color: '#2563eb' },
            { label: 'Pro',   value: clinics?.filter(c => c.subscription_plan === 'pro').length   ?? 0, bg: '#faf5ff', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--pf-border)' }}>
              <span className="inline-block text-xs px-2.5 py-1 rounded-full font-medium mb-3"
                style={{ background: s.bg, color: s.color }}>{s.label}</span>
              <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>clínicas</p>
            </div>
          ))}
        </div>

        <SubscriptionManager clinics={clinicsWithUsers} />
      </div>
    </AdminLayout>
  )
}
