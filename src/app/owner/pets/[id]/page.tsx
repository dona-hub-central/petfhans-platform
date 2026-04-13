import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OwnerPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pet } = await admin.from('pets').select('*').eq('id', id).single()
  if (!pet) redirect('/owner/dashboard')

  const { data: records } = await admin.from('medical_records')
    .select('*, profiles!medical_records_vet_id_fkey(full_name)')
    .eq('pet_id', id).order('visit_date', { ascending: false })

  const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="bg-white border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/owner/dashboard" className="text-xs" style={{ color: 'var(--muted)' }}>← Inicio</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{pet.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Pet header */}
        <div className="bg-white rounded-2xl border p-6 mb-6 flex items-center gap-5"
          style={{ borderColor: 'var(--border)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
            style={{ background: 'var(--accent-s)' }}>
            {speciesIcon[pet.species]}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{pet.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {pet.breed ?? pet.species}
              {pet.birth_date ? ` · ${getAge(pet.birth_date)}` : ''}
              {pet.weight ? ` · ${pet.weight} kg` : ''}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {pet.gender === 'male' ? '♂ Macho' : '♀ Hembra'}
              {pet.neutered ? ' · Castrado' : ''}
            </p>
          </div>
        </div>

        {/* Historial médico */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              Historial médico
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {records && records.length > 0 ? records.map((r: any) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                    {new Date(r.visit_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {r.profiles && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Dr. {(r.profiles as any).full_name?.split(' ')[0]}
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.reason}</p>
                {r.diagnosis && (
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Diagnóstico: {r.diagnosis}</p>
                )}
                {r.treatment && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Tratamiento: {r.treatment}</p>
                )}
                {r.next_visit && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--accent)' }}>
                    📅 Próxima visita: {new Date(r.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>
            )) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin consultas registradas aún</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function getAge(birthDate: string) {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
