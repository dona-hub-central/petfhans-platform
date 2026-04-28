import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { Stethoscope, BadgeCheck, Building2 } from 'lucide-react'

export const metadata = { title: 'Veterinarios · Admin Petfhans' }

type VetRow = {
  user_id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
  clinic_role: string                          // role within profile_clinics (vet_admin/veterinarian)
  clinic: { id: string; name: string; slug: string; verified: boolean } | null
}

export default async function AdminVetsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('role, full_name').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const { filter = 'all', q = '' } = await searchParams

  // Get all vet/admin clinic links with clinic info
  const { data: links } = await admin
    .from('profile_clinics')
    .select('user_id, role, clinics(id, name, slug, verified)')
    .in('role', ['vet_admin', 'veterinarian'])

  const linkByUser = new Map<string, { clinic_role: string; clinic: VetRow['clinic'] }>()
  ;(links ?? []).forEach((l: { user_id: string; role: string; clinics: unknown }) => {
    if (!linkByUser.has(l.user_id)) {
      linkByUser.set(l.user_id, {
        clinic_role: l.role,
        clinic: (l.clinics as VetRow['clinic']) ?? null,
      })
    }
  })

  const userIds = [...linkByUser.keys()]
  let rows: VetRow[] = []
  if (userIds.length > 0) {
    let pq = admin.from('profiles')
      .select('user_id, full_name, email, avatar_url, role')
      .in('user_id', userIds)
    if (q) pq = pq.ilike('full_name', `%${q}%`)
    const { data: profiles } = await pq.order('full_name')
    rows = (profiles ?? []).map(p => {
      const link = linkByUser.get(p.user_id)!
      return {
        user_id:    p.user_id,
        full_name:  p.full_name,
        email:      p.email,
        avatar_url: p.avatar_url,
        role:       p.role,
        clinic_role: link.clinic_role,
        clinic:     link.clinic,
      }
    })
  }

  const verifiedRows = rows.filter(r => r.clinic?.verified)
  const unverifiedRows = rows.filter(r => !r.clinic?.verified)

  let visible = rows
  if (filter === 'verified')   visible = verifiedRows
  if (filter === 'unverified') visible = unverifiedRows

  const filters = [
    { key: 'all',        label: 'Todos',        count: rows.length },
    { key: 'verified',   label: 'En clínica verificada',   count: verifiedRows.length },
    { key: 'unverified', label: 'Pendientes de verificar', count: unverifiedRows.length },
  ] as const

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="adm-pg">
        <div className="pf-page-hdr mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Veterinarios</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{visible.length} mostrados</p>
          </div>
          <Link href="/admin/support" className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>
            Solicitudes pendientes →
          </Link>
        </div>

        <form method="GET" className="mb-4">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre..."
              style={{
                flex: 1,
                borderRadius: 10, border: '1px solid var(--pf-border)',
                padding: '9px 14px', fontSize: 14, color: 'var(--pf-ink)',
                fontFamily: 'var(--pf-font-body)', outline: 'none',
              }}
            />
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
            <button type="submit" className="btn-pf" style={{ padding: '9px 18px', fontSize: 14 }}>Buscar</button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mb-5">
          {filters.map(f => {
            const active = filter === f.key
            const href = `/admin/vets${f.key === 'all' ? (q ? `?q=${encodeURIComponent(q)}` : '') : `?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}`
            return (
              <Link key={f.key} href={href}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                style={{
                  borderColor: active ? 'var(--pf-coral)' : 'var(--pf-border)',
                  background:  active ? 'var(--pf-coral-soft)' : '#fff',
                  color:       active ? 'var(--pf-coral-dark)' : 'var(--pf-muted)',
                }}>
                {f.label} <span className="ml-1.5 opacity-60">({f.count})</span>
              </Link>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
            {visible.length > 0 ? visible.map((vet) => (
              <div key={vet.user_id} className="adm-clinic-row">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', border: '1.5px solid var(--pf-border)' }}>
                    {vet.avatar_url
                      ? <img src={vet.avatar_url} alt={vet.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Stethoscope size={16} strokeWidth={1.75} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--pf-ink)' }}>{vet.full_name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--pf-muted)' }}>{vet.email}</p>
                    {vet.clinic ? (
                      <Link href={`/admin/clinics/${vet.clinic.id}`}
                        className="text-xs mt-1 inline-flex items-center gap-1"
                        style={{ color: 'var(--pf-coral)', textDecoration: 'none' }}>
                        <Building2 size={11} strokeWidth={2} />
                        {vet.clinic.name}
                        {vet.clinic.verified && <BadgeCheck size={11} strokeWidth={2} />}
                      </Link>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: 'var(--pf-muted)' }}>Sin clínica vinculada</p>
                    )}
                  </div>
                </div>
                <div className="adm-clinic-row-right">
                  <RoleBadge role={vet.clinic_role} />
                  <VerifiedBadge verified={!!vet.clinic?.verified} />
                </div>
              </div>
            )) : (
              <div className="px-6 py-16 text-center">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
                  <Stethoscope size={40} strokeWidth={1.5} />
                </div>
                <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>
                  {q ? `No hay veterinarios para "${q}"` :
                   filter === 'verified' ? 'No hay veterinarios en clínicas verificadas' :
                   filter === 'unverified' ? 'No hay veterinarios pendientes de verificar' :
                   'No hay veterinarios registrados'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    vet_admin:    { label: 'Admin clínica', bg: '#f3e8ff', color: '#6d28d9' },
    veterinarian: { label: 'Veterinario',   bg: '#eff6ff', color: '#1d4ed8' },
  }
  const s = map[role] ?? map.veterinarian
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        background: verified ? '#edfaf1' : '#fff8e6',
        color:      verified ? '#1a7a3c' : '#b07800',
      }}>
      {verified ? 'Verificado' : 'Sin verificar'}
    </span>
  )
}
