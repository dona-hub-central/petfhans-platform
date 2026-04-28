import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { Building2, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types'

export default async function ClinicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const { id } = await params
  const { created } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const { data: clinic } = await admin
    .from('clinics')
    .select('*')
    .eq('id', id)
    .single()

  if (!clinic) redirect('/admin')

  const [
    { data: team },
    { count: petCount },
    { count: recordCount },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('clinic_id', id).in('role', ['vet_admin', 'veterinarian']),
    admin.from('pets').select('*', { count: 'exact', head: true }).eq('clinic_id', id),
    admin.from('medical_records').select('*', { count: 'exact', head: true }).eq('clinic_id', id),
  ])

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
    <div>
      <div className="adm-pg" style={{ paddingBottom: 8, paddingTop: 24 }}>
        <div className="flex items-center gap-2">
          <Link href="/admin/clinics" className="text-xs" style={{ color: 'var(--pf-muted)' }}>Clínicas</Link>
          <span className="text-xs" style={{ color: 'var(--pf-border)' }}>/</span>
          <span className="text-xs font-medium" style={{ color: 'var(--pf-ink)' }}>{clinic.name}</span>
        </div>
      </div>
      <main className="adm-pg" style={{ paddingTop: 8, maxWidth: 896 }}>
        {created && (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-3"
            style={{ background: '#edfaf1', border: '1px solid #b2f0c9' }}>
            <CheckCircle size={20} strokeWidth={2} style={{ color: '#1a7a3c', flexShrink: 0 }} />
            <div>
              <p className="font-semibold" style={{ color: '#1a7a3c' }}>¡Clínica creada exitosamente!</p>
              <p className="text-sm" style={{ color: '#2d9c5e' }}>
                El administrador recibirá acceso en{' '}
                <strong>{clinic.slug}.petfhans.com</strong>
              </p>
            </div>
          </div>
        )}

        {/* Info clínica */}
        <div className="bg-white rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--pf-border)' }}>
          <style>{`
            .clinic-det-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
            .clinic-det-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:24px; padding-top:24px; border-top: 1px solid var(--pf-border); }
            @media (max-width:767px) {
              .clinic-det-hdr { flex-direction:column; }
              .clinic-det-stats { grid-template-columns:repeat(3,1fr); gap:8px; }
            }
          `}</style>
          <div className="clinic-det-hdr">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                <Building2 size={24} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>{clinic.name}</h2>
                <a href={`https://${clinic.slug}.petfhans.com`} target="_blank"
                  className="text-sm hover:underline" style={{ color: 'var(--pf-coral)' }}>
                  {clinic.slug}.petfhans.com ↗
                </a>
              </div>
            </div>
            <span className="text-sm px-3 py-1 rounded-full font-medium flex-shrink-0"
              style={{
                background: clinic.subscription_status === 'active' ? '#edfaf1' : clinic.subscription_status === 'trial' ? '#fff8e6' : '#fee2e2',
                color: clinic.subscription_status === 'active' ? '#1a7a3c' : clinic.subscription_status === 'trial' ? '#b07800' : '#dc2626',
              }}>
              {clinic.subscription_status}
            </span>
          </div>

          <div className="clinic-det-stats">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{petCount ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>Mascotas / {clinic.max_patients} máx</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{recordCount ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{team?.length ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>Veterinarios</p>
            </div>
          </div>
        </div>

        {/* Equipo */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>Equipo veterinario</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
            {team && team.length > 0 ? (team as Profile[]).map((member) => (
              <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                  {member.full_name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>{member.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>{member.email}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={member.role === 'vet_admin'
                    ? { background: '#faf5ff', color: '#7c3aed' }
                    : { background: '#eff6ff', color: '#2563eb' }}>
                  {member.role === 'vet_admin' ? 'Admin' : 'Veterinario'}
                </span>
              </div>
            )) : (
              <p className="px-6 py-8 text-sm text-center" style={{ color: 'var(--pf-muted)' }}>Sin equipo registrado</p>
            )}
          </div>
        </div>
      </main>
    </div>
    </AdminLayout>
  )
}
