import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PetAvatar from '@/components/shared/PetAvatar'
import LogoutButton from '@/components/owner/LogoutButton'
import { Building2, PawPrint, Calendar, Store, Plus } from 'lucide-react'
import type { Pet, PetWithNextVisit } from '@/types'
import { ensureProfile } from '@/lib/ensure-profile'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Backfill profile if missing
  const ensured = await ensureProfile(user)
  if (!ensured) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id, full_name').eq('user_id', user.id).single()

  if (!profile) redirect('/auth/login')

  const { data: clinicLink } = await admin
    .from('profile_clinics')
    .select('clinics(id, name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  // Use pet_access as authoritative source — owners only see pets explicitly granted
  const { data: access } = await admin.from('pet_access')
    .select('pet_id').eq('owner_id', profile.id)
  const accessPetIds = (access ?? []).map(a => a.pet_id)

  let pets: Pet[] = []
  if (accessPetIds.length > 0) {
    const { data } = await admin.from('pets')
      .select('*').in('id', accessPetIds).eq('is_active', true)
    pets = (data ?? []) as Pet[]
  }

  const petIds = pets.map(p => p.id)
  const today = new Date().toISOString().split('T')[0]
  const nextVisitMap: Record<string, string> = {}
  if (petIds.length > 0) {
    const { data: visits } = await admin.from('medical_records')
      .select('pet_id, next_visit')
      .in('pet_id', petIds)
      .gt('next_visit', today)
      .order('next_visit', { ascending: true })
    visits?.forEach(v => { if (v.pet_id && !nextVisitMap[v.pet_id]) nextVisitMap[v.pet_id] = v.next_visit })
  }
  const petsWithInfo = pets.map(pet => ({ ...pet, nextVisit: nextVisitMap[pet.id] ?? null }))

  const speciesLabel: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }
  type ClinicRow = { id: string; name: string; slug: string }
  const clinic = (clinicLink?.clinics as unknown as ClinicRow | null)
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:var(--pf-bg); font-family:var(--pf-font-body); }

        /* MOBILE */
        .dash { min-height:100svh; }
        .dash-header { background:linear-gradient(170deg,var(--pf-coral) 0%,#f9a394 100%); padding:calc(env(safe-area-inset-top) + 20px) 18px 24px; }
        .dash-top { display:flex; align-items:center; justify-content:space-between; }
        .dash-greeting { color:rgba(255,255,255,.8); font-size:14px; margin:0 0 2px; font-family:var(--pf-font-body); }
        .dash-name { color:#fff; font-size:26px; font-weight:700; margin:0; font-family:var(--pf-font-display); letter-spacing:-0.01em; }
        .dash-clinic { color:rgba(255,255,255,.75); font-size:13px; margin:6px 0 0; display:flex; align-items:center; gap:5px; font-family:var(--pf-font-body); }
        .dash-avatar { width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:#fff; text-decoration:none; font-family:var(--pf-font-display); }
        .dash-body { padding:16px 14px calc(env(safe-area-inset-bottom) + 24px); }
        .section-title { font-size:20px; font-weight:700; color:var(--pf-ink); margin:0 2px 12px; letter-spacing:-0.01em; font-family:var(--pf-font-display); }
        .pet-card { background:var(--pf-white); border-radius:20px; display:flex; align-items:center; gap:14px; padding:14px 16px; margin-bottom:10px; text-decoration:none; box-shadow:var(--pf-shadow-sm); border:0.5px solid var(--pf-border); transition:border-color 0.2s, box-shadow 0.2s; }
        .pet-card:hover { border-color:var(--pf-coral-mid); box-shadow:var(--pf-shadow-card-hover); }
        .pet-name { font-size:18px; font-weight:700; color:var(--pf-ink); margin:0 0 3px; font-family:var(--pf-font-display); }
        .pet-sub { font-size:13px; color:var(--pf-muted); margin:0 0 6px; font-family:var(--pf-font-body); }
        .pet-badge { display:inline-flex; align-items:center; gap:4px; background:var(--pf-coral-soft); color:var(--pf-coral-dark); font-size:11px; font-weight:700; padding:3px 10px; border-radius:var(--pf-r-pill); font-family:var(--pf-font-body); }
        .pet-chevron { color:var(--pf-hint); font-size:22px; flex-shrink:0; }
        .empty-pets { background:var(--pf-white); border-radius:20px; padding:48px 20px; text-align:center; border:0.5px solid var(--pf-border); }

        /* DESKTOP */
        @media (min-width:768px) {
          .dash { max-width:1100px; margin:0 auto; min-height:100vh; }
          .dash-header { background:none; padding:36px 24px 0; }
          .dash-greeting { color:var(--pf-muted); }
          .dash-name { color:var(--pf-ink); font-size:32px; }
          .dash-clinic { color:var(--pf-muted); }
          .dash-avatar { background:var(--pf-coral-soft); color:var(--pf-coral); }
          .dash-body { padding:20px 24px 48px; }
          .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .pet-card { border-radius:14px; }
          .section-title { font-size:22px; }
        }
      `}</style>

      <div className="dash">
        <div className="dash-header">
          <div className="dash-top">
            <div>
              <p className="dash-greeting">Bienvenido/a</p>
              <h1 className="dash-name">{firstName}</h1>
              {clinic && (
                <p className="dash-clinic">
                  <Building2 size={13} strokeWidth={2} />
                  {clinic.name}
                </p>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Link href="/owner/profile" className="dash-avatar">
                {profile?.full_name?.[0]}
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="dash-body">
          {/* Marketplace link */}
          <Link
            href="/marketplace/clinicas"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid var(--pf-border)', background: '#fff',
              color: 'var(--pf-ink)', textDecoration: 'none',
              fontSize: 13, fontWeight: 500, marginBottom: 20,
              boxShadow: 'var(--pf-shadow-sm)',
            }}
          >
            <Store size={14} strokeWidth={2} style={{ color: 'var(--pf-coral)' }} />
            Buscar clínicas
          </Link>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <p className="section-title" style={{ margin:0 }}>Mis mascotas</p>
            <Link href="/owner/pets/new"
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'7px 14px', borderRadius:10,
                background:'var(--pf-coral)', color:'#fff',
                textDecoration:'none', fontSize:13, fontWeight:600,
              }}>
              <Plus size={14} strokeWidth={2.5} />
              Añadir
            </Link>
          </div>

          {petsWithInfo.length === 0 ? (
            <div className="empty-pets">
              <div style={{ display:'flex', justifyContent:'center', marginBottom:10, color:'var(--pf-coral)' }}>
                <PawPrint size={44} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize:17, fontWeight:700, color:'var(--pf-ink)', margin:'0 0 4px', fontFamily:'var(--pf-font-display)' }}>Sin mascotas aún</p>
              <p style={{ fontSize:14, color:'var(--pf-muted)', margin:'0 0 16px', fontFamily:'var(--pf-font-body)' }}>Registra a tu compañero para comenzar</p>
              <Link href="/owner/pets/new"
                style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'10px 20px', borderRadius:10,
                  background:'var(--pf-coral)', color:'#fff',
                  textDecoration:'none', fontSize:14, fontWeight:600,
                }}>
                <Plus size={15} strokeWidth={2.5} />
                Añadir mascota
              </Link>
            </div>
          ) : (
            <div className="dash-grid">
              {(petsWithInfo as PetWithNextVisit[]).map((pet) => (
                <Link key={pet.id} href={`/owner/pets/${pet.id}`} className="pet-card">
                  <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url} size={62} editable={false} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="pet-name">{pet.name}</p>
                    <p className="pet-sub">{speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}{pet.weight ? ` · ${pet.weight}kg` : ''}</p>
                    {pet.nextVisit && (
                      <span className="pet-badge">
                        <Calendar size={11} strokeWidth={2.5} />
                        {new Date(pet.nextVisit).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                      </span>
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
