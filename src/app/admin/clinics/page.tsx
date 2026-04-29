import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { Building2, BadgeCheck } from 'lucide-react'
import type { ClinicWithAdmin } from '@/types'

export default async function ClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const { filter = 'all' } = await searchParams

  let query = admin
    .from('clinics')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
  if (filter === 'verified')   query = query.eq('verified', true)
  if (filter === 'unverified') query = query.eq('verified', false)

  const { data: clinics } = await query

  // Counts for filter pills
  const [{ count: totalCount }, { count: verifiedCount }, { count: unverifiedCount }] = await Promise.all([
    admin.from('clinics').select('*', { count: 'exact', head: true }),
    admin.from('clinics').select('*', { count: 'exact', head: true }).eq('verified', true),
    admin.from('clinics').select('*', { count: 'exact', head: true }).eq('verified', false),
  ])

  const filters = [
    { key: 'all',        label: 'Todas',         count: totalCount      ?? 0 },
    { key: 'verified',   label: 'Verificadas',   count: verifiedCount   ?? 0 },
    { key: 'unverified', label: 'Sin verificar', count: unverifiedCount ?? 0 },
  ] as const

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="adm-pg">
        <div className="pf-page-hdr mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Clínicas</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{clinics?.length ?? 0} mostradas</p>
          </div>
          <Link href="/admin/clinics/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <span>+</span> Nueva clínica
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {filters.map(f => {
            const active = (filter === f.key) || (filter === undefined && f.key === 'all')
            return (
              <Link key={f.key} href={`/admin/clinics${f.key === 'all' ? '' : `?filter=${f.key}`}`}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                style={{
                  borderColor: active ? 'var(--pf-coral)' : 'var(--pf-border)',
                  background:  active ? 'var(--pf-coral-soft)' : '#fff',
                  color:       active ? 'var(--pf-coral-dark)' : 'var(--pf-muted)',
                }}>
                {f.label} <span className="ml-1.5 opacity-60">({f.count})</span>
              </Link>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
            {clinics && clinics.length > 0 ? (clinics as ClinicWithAdmin[]).map((clinic) => (
              <div key={clinic.id} className="adm-clinic-row">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                    <Building2 size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>{clinic.name}</p>
                      {clinic.verified && (
                        <span title="Verificada"
                          style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--pf-coral)' }}>
                          <BadgeCheck size={14} strokeWidth={2} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{clinic.slug}.petfhans.com</p>
                  </div>
                </div>
                <div className="adm-clinic-row-right">
                  <VerifiedBadge verified={clinic.verified} />
                  <PlanBadge plan={clinic.subscription_plan} />
                  <StatusBadge status={clinic.subscription_status} />
                  <Link href={`/admin/clinics/${clinic.id}`}
                    className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>
                    Ver →
                  </Link>
                </div>
              </div>
            )) : (
              <div className="px-6 py-16 text-center">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
                  <Building2 size={40} strokeWidth={1.5} />
                </div>
                <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>
                  {filter === 'verified' ? 'No hay clínicas verificadas' :
                   filter === 'unverified' ? 'No hay clínicas sin verificar' :
                   'No hay clínicas registradas'}
                </p>
                {filter === 'all' && (
                  <Link href="/admin/clinics/new"
                    className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--pf-coral)' }}>
                    Crear la primera →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        background: verified ? '#edfaf1' : '#fff8e6',
        color:      verified ? '#1a7a3c' : '#b07800',
      }}>
      {verified ? 'Verificada' : 'Sin verificar'}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    trial: { label: 'Trial', bg: '#f3f4f6', color: '#6b7280' },
    basic: { label: 'Basic', bg: '#eff6ff', color: '#2563eb' },
    pro:   { label: 'Pro',   bg: '#faf5ff', color: '#7c3aed' },
  }
  const s = map[plan] ?? map.trial
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    trial:    { label: 'Trial',    bg: '#fff8e6', color: '#b07800' },
    active:   { label: 'Activa',   bg: '#edfaf1', color: '#1a7a3c' },
    inactive: { label: 'Inactiva', bg: '#fee2e2', color: '#dc2626' },
  }
  const s = map[status] ?? map.trial
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}
