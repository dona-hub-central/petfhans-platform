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

  const { data: stats } = await supabase
    .from('pets')
    .select('id', { count: 'exact' })
    .eq('clinic_id', profile?.clinic_id)

  const { data: recentRecords } = await supabase
    .from('medical_records')
    .select('*, pets(name, species)')
    .eq('clinic_id', profile?.clinic_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐾</span>
            <div>
              <h1 className="font-bold text-gray-800">Petfhans</h1>
              <p className="text-xs text-gray-500">{profile?.clinics?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{profile?.full_name}</span>
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm">
              {profile?.full_name?.[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Hola, {profile?.full_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1">Aquí está el resumen de hoy</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="🐶"
            label="Pacientes activos"
            value={stats?.length ?? 0}
            color="emerald"
          />
          <StatCard
            icon="📋"
            label="Consultas este mes"
            value={recentRecords?.length ?? 0}
            color="blue"
          />
          <StatCard
            icon="📨"
            label="Invitaciones pendientes"
            value={0}
            color="purple"
          />
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ActionCard
            icon="➕"
            title="Nueva ficha"
            description="Registrar nueva mascota"
            href="/vet/pets/new"
            color="emerald"
          />
          <ActionCard
            icon="📝"
            title="Nueva consulta"
            description="Registrar consulta médica"
            href="/vet/records/new"
            color="blue"
          />
          <ActionCard
            icon="📨"
            title="Invitar dueño"
            description="Enviar link de acceso"
            href="/vet/invitations/new"
            color="purple"
          />
          <ActionCard
            icon="🤖"
            title="Consultar IA"
            description="Análisis clínico con IA"
            href="/vet/ai"
            color="orange"
          />
        </div>

        {/* Consultas recientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Consultas recientes</h3>
          {recentRecords && recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.map((record: any) => (
                <div key={record.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                  <span className="text-2xl">
                    {record.pets?.species === 'dog' ? '🐶' : record.pets?.species === 'cat' ? '🐱' : '🐾'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{record.pets?.name}</p>
                    <p className="text-sm text-gray-500">{record.reason}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(record.visit_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">
              No hay consultas registradas aún
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string
  label: string
  value: number
  color: string
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function ActionCard({ icon, title, description, href, color }: {
  icon: string
  title: string
  description: string
  href: string
  color: string
}) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-200 hover:border-emerald-400',
    blue: 'border-blue-200 hover:border-blue-400',
    purple: 'border-purple-200 hover:border-purple-400',
    orange: 'border-orange-200 hover:border-orange-400',
  }
  return (
    <a
      href={href}
      className={`bg-white rounded-xl border-2 p-5 flex items-center gap-4 transition ${colors[color]}`}
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  )
}
