import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'superadmin') redirect('/auth/login')

  // Métricas globales
  const [
    { count: totalClinics },
    { count: totalVets },
    { count: totalPets },
    { count: totalOwners },
    { data: clinics },
  ] = await Promise.all([
    supabase.from('clinics').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['vet_admin', 'veterinarian']),
    supabase.from('pets').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pet_owner'),
    supabase.from('clinics').select('*, profiles!clinics_owner_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐾</span>
            <div>
              <h1 className="font-bold text-gray-800">Petfhans</h1>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
            </div>
          </div>
          <span className="text-sm text-gray-500">{profile?.full_name}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Panel Global</h2>
            <p className="text-gray-500 mt-1">Gestión de todas las clínicas</p>
          </div>
          <Link
            href="/admin/clinics/new"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2"
          >
            <span>+</span> Nueva clínica
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard icon="🏥" label="Clínicas" value={totalClinics ?? 0} color="emerald" />
          <MetricCard icon="👨‍⚕️" label="Veterinarios" value={totalVets ?? 0} color="blue" />
          <MetricCard icon="🐾" label="Mascotas" value={totalPets ?? 0} color="orange" />
          <MetricCard icon="👤" label="Dueños" value={totalOwners ?? 0} color="purple" />
        </div>

        {/* Lista de clínicas */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Clínicas registradas</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {clinics && clinics.length > 0 ? clinics.map((clinic: any) => (
              <div key={clinic.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">
                    🏥
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{clinic.name}</p>
                    <p className="text-sm text-gray-500">
                      {clinic.slug}.petfhans.com · {clinic.profiles?.email ?? 'Sin admin'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={clinic.subscription_status} />
                  <Link
                    href={`/admin/clinics/${clinic.id}`}
                    className="text-sm text-emerald-600 hover:underline font-medium"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            )) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-400 text-sm">No hay clínicas registradas aún</p>
                <Link href="/admin/clinics/new" className="text-emerald-600 text-sm hover:underline mt-2 inline-block">
                  Crear la primera clínica →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue:    'bg-blue-50 text-blue-700',
    orange:  'bg-orange-50 text-orange-700',
    purple:  'bg-purple-50 text-purple-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trial:    { label: 'Trial',    cls: 'bg-yellow-100 text-yellow-700' },
    active:   { label: 'Activa',   cls: 'bg-green-100 text-green-700' },
    inactive: { label: 'Inactiva', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] ?? map.trial
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}
