import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Inbox, UserRound, Stethoscope, PawPrint, Calendar, type LucideIcon } from 'lucide-react'
import RequestActions from '@/components/vet/RequestActions'

export const metadata = { title: 'Solicitudes · Petfhans' }

type CareRequest = {
  id: string
  requester_id: string
  pet_name: string | null
  pet_species: string | null
  reason: string | null
  status: string
  created_at: string
  profiles: { full_name: string; email: string; avatar_url: string | null } | null
}

type JoinRequest = {
  id: string
  vet_id: string
  message: string | null
  status: string
  created_at: string
  profiles: { full_name: string; email: string; avatar_url: string | null; role: string } | null
}

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AvatarCircle({ name, url }: { name: string; url?: string | null }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: url ? 'transparent' : 'var(--pf-coral-soft)',
      color: 'var(--pf-coral)', border: '1.5px solid var(--pf-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, overflow: 'hidden',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name[0]?.toUpperCase()
      }
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--pf-r-md)',
        background: 'var(--pf-surface)', color: 'var(--pf-hint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
      }}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: 0 }}>{text}</p>
    </div>
  )
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') redirect('/vet/dashboard')
  if (!profile.clinic_id) redirect('/vet/dashboard')

  const [careRes, joinRes] = await Promise.all([
    admin
      .from('care_requests')
      .select(`
        id, requester_id, pet_name, pet_species, reason, status, created_at,
        profiles!requester_id(full_name, email, avatar_url)
      `)
      .eq('clinic_id', profile.clinic_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    admin
      .from('clinic_join_requests')
      .select(`
        id, vet_id, message, status, created_at,
        profiles!vet_id(full_name, email, avatar_url, role)
      `)
      .eq('clinic_id', profile.clinic_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const careRequests = (careRes.data ?? []) as CareRequest[]
  const joinRequests = (joinRes.data ?? []) as JoinRequest[]
  const total = careRequests.length + joinRequests.length

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:none } }
        @keyframes spin   { to { transform:rotate(360deg) } }
        .req-row { display:flex;align-items:flex-start;gap:12px;padding:16px 20px;
          border-top:0.5px solid var(--pf-border);animation:fadeUp 0.4s both; }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--pf-r-sm)',
            background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Inbox size={18} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ font: 'var(--pf-text-h1)', margin: 0, color: 'var(--pf-ink)' }}>
              Solicitudes
            </h1>
            <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>
              {total === 0 ? 'Sin solicitudes pendientes' : `${total} solicitud${total !== 1 ? 'es' : ''} pendiente${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </header>

      {/* ── Sección 1: Dueños solicitando atención ── */}
      <section style={{
        background: 'var(--pf-white)',
        borderRadius: 'var(--pf-r-md)',
        border: '0.5px solid var(--pf-border)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 20px', borderBottom: careRequests.length > 0 ? '0.5px solid var(--pf-border)' : 'none',
        }}>
          <UserRound size={15} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
          <h2 style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0, flex: 1 }}>
            Solicitudes de atención
          </h2>
          {careRequests.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 'var(--pf-r-pill)',
              background: 'var(--pf-warning)', color: 'var(--pf-warning-fg)',
            }}>
              {careRequests.length}
            </span>
          )}
        </header>

        {careRequests.length === 0
          ? <EmptyState icon={PawPrint} text="No hay solicitudes de atención pendientes" />
          : careRequests.map((cr, i) => {
              const requester = cr.profiles
              return (
                <div key={cr.id} className="req-row" style={{ animationDelay: `${i * 60}ms` }}>
                  <AvatarCircle name={requester?.full_name ?? '?'} url={requester?.avatar_url} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ font: 'var(--pf-text-body)', fontWeight: 600, color: 'var(--pf-ink)' }}>
                        {requester?.full_name ?? 'Dueño desconocido'}
                      </span>
                      {cr.pet_name && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 'var(--pf-r-pill)',
                          background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
                        }}>
                          {cr.pet_name}
                          {cr.pet_species ? ` · ${SPECIES_LABEL[cr.pet_species] ?? cr.pet_species}` : ''}
                        </span>
                      )}
                    </div>

                    {cr.reason && (
                      <p style={{
                        font: 'var(--pf-text-sm)', color: 'var(--pf-muted)',
                        margin: '4px 0', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {cr.reason}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <Calendar size={11} strokeWidth={2} style={{ color: 'var(--pf-hint)' }} />
                      <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-hint)' }}>
                        {formatDate(cr.created_at)}
                      </span>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <RequestActions id={cr.id} type="care" />
                    </div>
                  </div>
                </div>
              )
            })
        }
      </section>

      {/* ── Sección 2: Veterinarios solicitando unirse ── */}
      <section style={{
        background: 'var(--pf-white)',
        borderRadius: 'var(--pf-r-md)',
        border: '0.5px solid var(--pf-border)',
        overflow: 'hidden',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 20px', borderBottom: joinRequests.length > 0 ? '0.5px solid var(--pf-border)' : 'none',
        }}>
          <Stethoscope size={15} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
          <h2 style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0, flex: 1 }}>
            Solicitudes de veterinarios
          </h2>
          {joinRequests.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 'var(--pf-r-pill)',
              background: 'var(--pf-warning)', color: 'var(--pf-warning-fg)',
            }}>
              {joinRequests.length}
            </span>
          )}
        </header>

        {joinRequests.length === 0
          ? <EmptyState icon={Stethoscope} text="No hay veterinarios solicitando unirse" />
          : joinRequests.map((jr, i) => {
              const vet = jr.profiles
              const roleLabel = vet?.role === 'vet_admin' ? 'Admin de clínica' : 'Veterinario/a'
              return (
                <div key={jr.id} className="req-row" style={{ animationDelay: `${i * 60}ms` }}>
                  <AvatarCircle name={vet?.full_name ?? '?'} url={vet?.avatar_url} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ font: 'var(--pf-text-body)', fontWeight: 600, color: 'var(--pf-ink)' }}>
                        {vet?.full_name ?? 'Veterinario desconocido'}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 'var(--pf-r-pill)',
                        background: 'var(--pf-info)', color: 'var(--pf-info-fg)',
                      }}>
                        {roleLabel}
                      </span>
                    </div>

                    {vet?.email && (
                      <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '3px 0 0' }}>
                        {vet.email}
                      </p>
                    )}

                    {jr.message && (
                      <p style={{
                        font: 'var(--pf-text-sm)', color: 'var(--pf-muted)',
                        margin: '6px 0 0', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        &ldquo;{jr.message}&rdquo;
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <Calendar size={11} strokeWidth={2} style={{ color: 'var(--pf-hint)' }} />
                      <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-hint)' }}>
                        {formatDate(jr.created_at)}
                      </span>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <RequestActions id={jr.id} type="join" />
                    </div>
                  </div>
                </div>
              )
            })
        }
      </section>
    </>
  )
}
