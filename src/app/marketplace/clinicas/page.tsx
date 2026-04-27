import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import MarketplaceClinicCard from '@/components/marketplace/MarketplaceClinicCard'
import type { MarketplaceClinic } from '@/types'

export const metadata = { title: 'Clínicas · Marketplace · Petfhans' }

export default async function MarketplaceClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; verified?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { q = '', verified } = await searchParams
  const verifiedOnly = verified === 'true'

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Build excluded clinic IDs
  const blockedIds: string[] = []
  if (profile.role === 'pet_owner') {
    const { data: blocks } = await admin
      .from('clinic_blocks')
      .select('clinic_id')
      .eq('owner_id', profile.id)
    blocks?.forEach(b => blockedIds.push(b.clinic_id))
  }

  const linkedIds: string[] = []
  if (profile.role === 'pet_owner') {
    const { data: access } = await admin
      .from('pet_access')
      .select('clinic_id')
      .eq('owner_id', profile.id)
    access?.forEach(a => { if (!linkedIds.includes(a.clinic_id)) linkedIds.push(a.clinic_id) })
  } else {
    const { data: links } = await admin
      .from('profile_clinics')
      .select('clinic_id')
      .eq('user_id', user.id)
    links?.forEach((l: { clinic_id: string }) => { if (!linkedIds.includes(l.clinic_id)) linkedIds.push(l.clinic_id) })
  }

  const excludeIds = [...new Set([...blockedIds, ...linkedIds])]

  let query = admin
    .from('clinics')
    .select('id, name, slug, verified, public_profile')
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)
  if (verifiedOnly) query = query.eq('verified', true)
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: clinics } = await query
  const clinicList = (clinics ?? []) as MarketplaceClinic[]

  return (
    <div>
      {/* Search bar */}
      <form method="GET" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre de clínica..."
            style={{
              flex: 1, minWidth: 200,
              borderRadius: 10, border: '1px solid var(--pf-border)',
              padding: '9px 14px', fontSize: 14, color: 'var(--pf-ink)',
              fontFamily: 'var(--pf-font-body)', outline: 'none',
            }}
          />
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 10,
              border: '1px solid var(--pf-border)', background: verifiedOnly ? 'var(--pf-coral-soft)' : '#fff',
              fontSize: 13, color: 'var(--pf-ink)', cursor: 'pointer', userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              name="verified"
              value="true"
              defaultChecked={verifiedOnly}
              style={{ accentColor: 'var(--pf-coral)' }}
            />
            Solo verificadas
          </label>
          <button
            type="submit"
            className="btn-pf"
            style={{ padding: '9px 18px', fontSize: 14 }}
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Results */}
      {clinicList.length === 0 ? (
        <div
          style={{
            background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
            padding: '48px 20px', textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
            {q ? 'Sin resultados' : 'No hay clínicas disponibles'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>
            {q ? `No encontramos clínicas para "${q}"` : 'Todas las clínicas disponibles ya están en tu lista'}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 12px' }}>
            {clinicList.length} clínica{clinicList.length !== 1 ? 's' : ''} disponible{clinicList.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {clinicList.map(clinic => (
              <MarketplaceClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
