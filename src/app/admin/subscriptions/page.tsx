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
  const { data: clinics } = await admin
    .from('clinics')
    .select('id, name, slug, subscription_plan, subscription_status, max_patients, stripe_customer_id, stripe_subscription_id, created_at')
    .order('name', { ascending: true })

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Suscripciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Gestiona los planes y estados de cada clínica
          </p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Trial',   value: clinics?.filter(c => c.subscription_plan === 'trial').length  ?? 0, bg: '#f3f4f6', color: '#6b7280' },
            { label: 'Basic',   value: clinics?.filter(c => c.subscription_plan === 'basic').length  ?? 0, bg: '#eff6ff', color: '#2563eb' },
            { label: 'Pro',     value: clinics?.filter(c => c.subscription_plan === 'pro').length    ?? 0, bg: '#faf5ff', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <span className="inline-block text-xs px-2.5 py-1 rounded-full font-medium mb-3"
                style={{ background: s.bg, color: s.color }}>{s.label}</span>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>clínicas</p>
            </div>
          ))}
        </div>

        {/* Tabla editable */}
        <SubscriptionManager clinics={clinics ?? []} />
      </div>
    </AdminLayout>
  )
}
