import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

const speciesIcon: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾'
}
const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro'
}

export default async function PetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pets } = await admin.from('pets')
    .select('*, profiles!pets_owner_id_fkey(full_name, email)')
    .eq('clinic_id', profile?.clinic_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Mascotas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {pets?.length ?? 0} pacientes activos
          </p>
        </div>
        <Link href="/vet/pets/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva mascota
        </Link>
      </div>

      {pets && pets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pets.map((pet: any) => (
            <Link key={pet.id} href={`/vet/pets/${pet.id}`}
              className="bg-white rounded-2xl border p-5 hover:shadow-sm transition block"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: 'var(--accent-s)' }}>
                  {speciesIcon[pet.species] ?? '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate" style={{ color: 'var(--text)' }}>{pet.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                  {pet.birth_date && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {getAge(pet.birth_date)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>👤</span>
                  <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--muted)' }}>
                    {pet.profiles?.full_name ?? 'Sin dueño asignado'}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
                  style={{ background: pet.neutered ? '#edfaf1' : 'var(--bg)', color: pet.neutered ? '#1a7a3c' : 'var(--muted)' }}>
                  {pet.gender === 'male' ? '♂' : '♀'}{pet.neutered ? ' · Castrado' : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: 'var(--border)' }}>
          <div className="text-5xl mb-4">🐾</div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No hay mascotas registradas</p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--muted)' }}>Agrega el primer paciente de la clínica</p>
          <Link href="/vet/pets/new" className="btn-pf px-6 py-2.5 text-sm inline-block">
            + Nueva mascota
          </Link>
        </div>
      )}
    </VetLayout>
  )
}

function getAge(birthDate: string) {
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  return `${years} año${years !== 1 ? 's' : ''}`
}
