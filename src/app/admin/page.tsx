import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { Building2, Users, PawPrint, User, type LucideIcon } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const admin = createAdminClient()

  const [
    { count: totalClinics },
    { count: totalVets },
    { count: totalPets },
    { count: totalOwners },
    { data: clinics },
  ] = await Promise.all([
    admin.from('clinics').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['vet_admin', 'veterinarian']),
    admin.from('pets').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pet_owner'),
    admin.from('clinics').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Panel Global</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Visión general del sistema</p>
          </div>
          <Link href="/admin/clinics/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <span>+</span> Nueva clínica
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard Icon={Building2} label="Clínicas"     value={totalClinics ?? 0} />
          <MetricCard Icon={Users}     label="Veterinarios" value={totalVets ?? 0} />
          <MetricCard Icon={PawPrint}  label="Mascotas"     value={totalPets ?? 0} />
          <MetricCard Icon={User}      label="Dueños"       value={totalOwners ?? 0} />
        </div>

        {/* Tabla clínicas recientes */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>Clínicas recientes</h3>
            <Link href="/admin/clinics" className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>
              Ver todas →
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
            {clinics && clinics.length > 0 ? clinics.map((clinic: any) => (
              <div key={clinic.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                    <Building2 size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>{clinic.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>
                      {clinic.slug}.petfhans.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
                <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>No hay clínicas registradas aún</p>
                <Link href="/admin/clinics/new"
                  className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--pf-coral)' }}>
                  Crear la primera →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function MetricCard({ Icon, label, value }: { Icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--pf-border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{label}</p>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    trial: { label: 'Trial',  bg: '#f3f4f6', color: '#6b7280' },
    basic: { label: 'Basic',  bg: '#eff6ff', color: '#2563eb' },
    pro:   { label: 'Pro',    bg: '#faf5ff', color: '#7c3aed' },
  }
  const s = map[plan] ?? map.trial
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    trial:    { label: 'Trial',    bg: '#fff8e6', color: '#b07800' },
    active:   { label: 'Activa',   bg: '#edfaf1', color: '#1a7a3c' },
    inactive: { label: 'Inactiva', bg: '#fee2e2', color: '#dc2626' },
  }
  const s = map[status] ?? map.trial
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}
