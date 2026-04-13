import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pets } = await admin.from('pets')
    .select('*').eq('owner_id', profile?.id).eq('is_active', true)

  const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }
  const speciesLabel: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="bg-white border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-s)' }}>🐾</div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Petfhans</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{(profile as any)?.clinics?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
              {profile?.full_name?.[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Hola, {profile?.full_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Perfil de tus mascotas</p>
        </div>

        {pets && pets.length > 0 ? (
          <div className="space-y-4">
            {pets.map((pet: any) => (
              <Link key={pet.id} href={`/owner/pets/${pet.id}`}
                className="bg-white rounded-2xl border p-5 flex items-center gap-4 hover:shadow-sm transition block"
                style={{ borderColor: 'var(--border)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                  style={{ background: 'var(--accent-s)' }}>
                  {speciesIcon[pet.species]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{pet.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                  {pet.birth_date && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {getAge(pet.birth_date)}
                    </p>
                  )}
                </div>
                <span className="text-xl" style={{ color: 'var(--accent)' }}>→</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="text-5xl mb-4">🐾</div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Sin mascotas aún</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Tu veterinaria asignará tu mascota próximamente
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function getAge(birthDate: string) {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
