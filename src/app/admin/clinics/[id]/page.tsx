import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const admin = createAdminClient()

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800">{clinic.name}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {created && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-emerald-800">¡Clínica creada exitosamente!</p>
              <p className="text-sm text-emerald-600">
                El administrador recibirá acceso en{' '}
                <strong>{clinic.slug}.petfhans.com</strong>
              </p>
            </div>
          </div>
        )}

        {/* Info clínica */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl">🏥</div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{clinic.name}</h2>
                <a
                  href={`https://${clinic.slug}.petfhans.com`}
                  target="_blank"
                  className="text-sm text-emerald-600 hover:underline"
                >
                  {clinic.slug}.petfhans.com ↗
                </a>
              </div>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              clinic.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
              clinic.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {clinic.subscription_status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{petCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mascotas / {clinic.max_patients} máx</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{recordCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{team?.length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Veterinarios</p>
            </div>
          </div>
        </div>

        {/* Equipo */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Equipo veterinario</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {team && team.length > 0 ? team.map((member: any) => (
              <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                  {member.full_name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{member.full_name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  member.role === 'vet_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {member.role === 'vet_admin' ? 'Admin' : 'Veterinario'}
                </span>
              </div>
            )) : (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Sin equipo registrado</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
