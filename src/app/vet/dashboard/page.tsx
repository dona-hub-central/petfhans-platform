import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function VetDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, clinics(*)')
    .eq('user_id', user.id)
    .single()

  const { count: petCount } = await supabase
    .from('pets').select('*', { count: 'exact', head: true }).eq('clinic_id', profile?.clinic_id)

  const { data: recentRecords } = await supabase
    .from('medical_records')
    .select('*, pets(name, species)')
    .eq('clinic_id', profile?.clinic_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="bg-white border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-s)' }}>🐾</div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Petfhans</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{(profile as any)?.clinics?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{profile?.full_name}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
              {profile?.full_name?.[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Hola, {profile?.full_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Resumen de hoy</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon="🐶" label="Pacientes activos" value={petCount ?? 0} />
          <StatCard icon="📋" label="Consultas registradas" value={recentRecords?.length ?? 0} />
          <StatCard icon="📨" label="Invitaciones activas" value={0} />
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '➕', title: 'Nueva ficha', desc: 'Registrar mascota', href: '/vet/pets/new' },
            { icon: '📝', title: 'Nueva consulta', desc: 'Registrar consulta', href: '/vet/records/new' },
            { icon: '📨', title: 'Invitar dueño', desc: 'Enviar link de acceso', href: '/vet/invitations/new' },
            { icon: '🤖', title: 'Consultar IA', desc: 'Análisis clínico', href: '/vet/ai' },
          ].map(action => (
            <a key={action.href} href={action.href}
              className="bg-white rounded-2xl border p-5 flex flex-col gap-2 transition hover:shadow-sm"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl">{action.icon}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{action.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{action.desc}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Recientes */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Consultas recientes</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentRecords && recentRecords.length > 0 ? recentRecords.map((r: any) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">
                  {r.pets?.species === 'dog' ? '🐶' : r.pets?.species === 'cat' ? '🐱' : '🐾'}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.pets?.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{r.reason}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(r.visit_date).toLocaleDateString('es-ES')}
                </span>
              </div>
            )) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay consultas registradas aún</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3"
        style={{ background: 'var(--accent-s)' }}>{icon}</div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}
