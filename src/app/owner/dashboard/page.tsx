import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PetAvatar from '@/components/shared/PetAvatar'
import LogoutButton from '@/components/owner/LogoutButton'

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
    <>
      <style>{`
        html, body { margin:0; padding:0; background:#f2f2f7; font-family:'Roboto',sans-serif; }

        /* MOBILE */
        .dash { min-height:100svh; }
        .dash-header { background:linear-gradient(135deg,#EE726D 0%,#f9a394 100%); padding:48px 18px 24px; }
        .dash-top { display:flex; align-items:center; justify-content:space-between; }
        .dash-greeting { color:rgba(255,255,255,.8); font-size:14px; margin:0 0 2px; }
        .dash-name { color:#fff; font-size:26px; font-weight:800; margin:0; }
        .dash-clinic { color:rgba(255,255,255,.75); font-size:13px; margin:6px 0 0; display:flex; align-items:center; gap:5px; }
        .dash-avatar { width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:#fff; }
        .dash-body { padding:16px 14px 48px; }
        .section-title { font-size:20px; font-weight:800; color:#1c1c1e; margin:0 2px 12px; letter-spacing:-.3px; }
        .pet-card { background:#fff; border-radius:20px; display:flex; align-items:center; gap:14px; padding:14px 16px; margin-bottom:10px; text-decoration:none; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .pet-name { font-size:18px; font-weight:700; color:#1c1c1e; margin:0 0 3px; }
        .pet-sub { font-size:13px; color:#8e8e93; margin:0 0 6px; }
        .pet-badge { display:inline-flex; align-items:center; gap:4px; background:#fff0ef; color:#EE726D; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
        .pet-chevron { color:#c7c7cc; font-size:22px; flex-shrink:0; }
        .empty-pets { background:#fff; border-radius:20px; padding:48px 20px; text-align:center; }

        /* DESKTOP */
        @media (min-width:768px) {
          html, body { background:#f5f5f7; }
          .dash { max-width:1100px; margin:0 auto; min-height:100vh; }
          .dash-header { background:none; padding:36px 24px 0; }
          .dash-top { }
          .dash-greeting { color:#8e8e93; }
          .dash-name { color:#1c1c1e; font-size:32px; }
          .dash-clinic { color:#8e8e93; }
          .dash-avatar { background:#fff0ef; color:#EE726D; }
          .dash-body { padding:20px 24px 48px; }
          .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .pet-card { border-radius:16px; }
          .section-title { font-size:22px; }
        }
      `}</style>

      <div className="dash">
        <div className="dash-header">
          <div className="dash-top">
            <div>
              <p className="dash-greeting">Bienvenido/a 👋</p>
              <h1 className="dash-name">{firstName}</h1>
              {clinic && <p className="dash-clinic"><span>🏥</span> {clinic.name}</p>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="dash-avatar">{profile?.full_name?.[0]}</div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="dash-body">
          <p className="section-title">Mis mascotas</p>

          {petsWithInfo.length === 0 ? (
            <div className="empty-pets">
              <p style={{ fontSize:44, margin:'0 0 10px' }}>🐾</p>
              <p style={{ fontSize:17, fontWeight:700, color:'#1c1c1e', margin:'0 0 4px' }}>Sin mascotas aún</p>
              <p style={{ fontSize:14, color:'#8e8e93', margin:0 }}>Tu clínica te asignará una pronto</p>
            </div>
          ) : (
            <div className="dash-grid">
              {petsWithInfo.map((pet: any) => (
                <Link key={pet.id} href={`/owner/pets/${pet.id}`} className="pet-card">
                  <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url} size={62} editable={false} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="pet-name">{pet.name}</p>
                    <p className="pet-sub">{speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}{pet.weight ? ` · ${pet.weight}kg` : ''}</p>
                    {pet.nextVisit && (
                      <span className="pet-badge">📅 {new Date(pet.nextVisit).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}</span>
                    )}
                  </div>
                  <span className="pet-chevron">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
