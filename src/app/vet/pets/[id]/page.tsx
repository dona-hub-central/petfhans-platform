import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }
const speciesLabel: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }

export default async function PetDetailPage({
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

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pet } = await admin.from('pets')
    .select('*, profiles!pets_owner_id_fkey(full_name, email, phone)')
    .eq('id', id).single()

  if (!pet) redirect('/vet/pets')

  const { data: records } = await admin.from('medical_records')
    .select('*, profiles!medical_records_vet_id_fkey(full_name)')
    .eq('pet_id', id)
    .order('visit_date', { ascending: false })

  const age = pet.birth_date ? getAge(pet.birth_date) : null

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      {created && (
        <div className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: '#edfaf1', border: '1px solid #b2f0c9' }}>
          <span className="text-xl">🎉</span>
          <p className="text-sm font-medium" style={{ color: '#1a7a3c' }}>
            ¡{pet.name} registrado exitosamente!
          </p>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'var(--accent-s)' }}>
            {speciesIcon[pet.species]}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{pet.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
              {age ? ` · ${age}` : ''}
            </p>
          </div>
        </div>
        <Link href={`/vet/records/new?pet=${id}`} className="btn-pf px-4 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva consulta
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Datos básicos */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Datos del paciente</h3>
            <div className="space-y-3">
              {[
                { label: 'Especie',    value: speciesLabel[pet.species] },
                { label: 'Raza',       value: pet.breed ?? '—' },
                { label: 'Sexo',       value: pet.gender === 'male' ? '♂ Macho' : '♀ Hembra' },
                { label: 'Edad',       value: age ?? '—' },
                { label: 'Peso',       value: pet.weight ? `${pet.weight} kg` : '—' },
                { label: 'Castrado',   value: pet.neutered ? 'Sí' : 'No' },
                { label: 'Microchip',  value: pet.microchip ?? '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dueño */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Dueño</h3>
            {pet.profiles ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                    {(pet.profiles as any).full_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{(pet.profiles as any).full_name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{(pet.profiles as any).email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Sin dueño asignado</p>
            )}
          </div>

          {/* Notas */}
          {pet.notes && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>Notas</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{pet.notes}</p>
            </div>
          )}
        </div>

        {/* Historial médico */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Historial médico
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {records?.length ?? 0} consultas
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {records && records.length > 0 ? records.map((r: any) => (
                <Link key={r.id} href={`/vet/records/${r.id}`}
                  className="px-6 py-4 block hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                          {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {r.profiles && (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            · Dr. {(r.profiles as any).full_name?.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.reason}</p>
                      {r.diagnosis && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          Dx: {r.diagnosis}
                        </p>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--accent)' }}>Ver →</span>
                  </div>
                </Link>
              )) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin consultas registradas</p>
                  <Link href={`/vet/records/new?pet=${id}`}
                    className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--accent)' }}>
                    Registrar primera consulta →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </VetLayout>
  )
}

function getAge(birthDate: string) {
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 12) return `${months} meses`
  return `${Math.floor(months / 12)} años`
}
