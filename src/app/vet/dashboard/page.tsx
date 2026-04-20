import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

export const metadata = { title: 'Dashboard · Petfhans', description: 'Panel de gestión de tu clínica veterinaria.' }

export default async function VetDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { count: petCount } = await admin.from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .eq('is_active', true)

  const { data: recentRecords } = await admin.from('medical_records')
    .select('*, pets(name, species)')
    .eq('clinic_id', profile?.clinic_id)
    .order('visit_date', { ascending: false })
    .limit(5)

  const { count: invCount } = await admin.from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())

  const clinicName = (profile as any)?.clinics?.name ?? ''
  const userName = profile?.full_name ?? ''
  const firstName = userName.split(' ')[0]

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>
          Hola, {firstName} 👋
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Resumen de hoy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon="🐾" label="Pacientes activos"     value={petCount ?? 0} />
        <StatCard icon="📋" label="Consultas registradas" value={recentRecords?.length ?? 0} />
        <StatCard icon="📨" label="Invitaciones activas"  value={invCount ?? 0} />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '➕', title: 'Nueva mascota',  desc: 'Registrar paciente',  href: '/vet/pets/new' },
          { icon: '📝', title: 'Nueva consulta', desc: 'Registrar consulta',  href: '/vet/records/new' },
          { icon: '📨', title: 'Invitar dueño',  desc: 'Enviar link acceso',  href: '/vet/invitations/new' },
          { icon: '🤖', title: 'IA Clínica',     desc: 'Análisis con IA',     href: '/vet/ai' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-white rounded-2xl border p-5 flex flex-col gap-2 hover:shadow-sm transition"
            style={{ borderColor: 'var(--pf-border)' }}>
            <span className="text-2xl">{a.icon}</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>{a.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Consultas recientes */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>Consultas recientes</h3>
          <Link href="/vet/records" className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>
            Ver todas →
          </Link>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
          {recentRecords && recentRecords.length > 0 ? recentRecords.map((r: any) => (
            <Link key={r.id} href={`/vet/records/${r.id}`}
              className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition block">
              <span className="text-2xl">
                {r.pets?.species === 'dog' ? '🐶' : r.pets?.species === 'cat' ? '🐱' : r.pets?.species === 'rabbit' ? '🐰' : '🐾'}
              </span>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>{r.pets?.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{r.reason}</p>
              </div>
              <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>
                {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </span>
            </Link>
          )) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>No hay consultas aún</p>
            </div>
          )}
        </div>
      </div>
    </VetLayout>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--pf-border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3"
        style={{ background: 'var(--pf-coral-soft)' }}>{icon}</div>
      <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{label}</p>
    </div>
  )
}
