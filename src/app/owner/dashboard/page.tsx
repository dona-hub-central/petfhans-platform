import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PetAvatar from '@/components/shared/PetAvatar'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(id, name, slug)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pets } = await admin.from('pets')
    .select('*').eq('owner_id', profile?.id).eq('is_active', true)

  const petsWithInfo = await Promise.all((pets ?? []).map(async (pet) => {
    const { data: next } = await admin.from('medical_records')
      .select('next_visit').eq('pet_id', pet.id)
      .gt('next_visit', new Date().toISOString().split('T')[0])
      .order('next_visit', { ascending: true }).limit(1).single()
    return { ...pet, nextVisit: next?.next_visit }
  }))

  const speciesLabel: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }
  const clinic = (profile as any)?.clinics
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: "'Roboto', sans-serif",
      maxWidth: 480,
      margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #f0a090 100%)',
        padding: 'calc(env(safe-area-inset-top,0px) + 40px) 20px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, margin: '0 0 2px' }}>Bienvenido/a 👋</p>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>{firstName}</h1>
          </div>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(255,255,255,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff',
          }}>
            {profile?.full_name?.[0]}
          </div>
        </div>
        {clinic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 14 }}>🏥</span>
            <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>{clinic.name}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 14px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <p style={{ fontSize: 13, fontWeight: 700, color: '#888', margin: '0 2px',
          textTransform: 'uppercase', letterSpacing: .5 }}>
          Mis mascotas
        </p>

        {petsWithInfo.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 44, margin: '0 0 10px' }}>🐾</p>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', margin: '0 0 4px' }}>Sin mascotas aún</p>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Tu veterinaria te asignará una pronto</p>
          </div>
        ) : petsWithInfo.map((pet: any) => (
          <Link key={pet.id} href={`/owner/pets/${pet.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 20,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              transition: 'transform .1s',
            }}>
              <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url}
                size={60} editable={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a', margin: '0 0 3px' }}>{pet.name}</p>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>
                  {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                  {pet.weight ? ` · ${pet.weight}kg` : ''}
                </p>
                {pet.nextVisit && (
                  <span style={{
                    display: 'inline-block',
                    background: 'var(--accent-s)', color: 'var(--accent)',
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  }}>
                    📅 {new Date(pet.nextVisit).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 22, color: '#ccc' }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
