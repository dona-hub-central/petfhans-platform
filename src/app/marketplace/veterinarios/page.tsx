import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import MarketplaceVetCard from '@/components/marketplace/MarketplaceVetCard'
import type { MarketplaceVet } from '@/types'

export const metadata = { title: 'Veterinarios · Marketplace · Petfhans' }

export default async function MarketplaceVetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { q = '' } = await searchParams
  const admin = createAdminClient()

  // Get vet–clinic links from the multi-clinic table
  type ClinicLink = { user_id: string; clinic_id: string; clinics: { id: string; name: string; slug: string } | null }
  const { data: links } = await admin
    .from('profile_clinics')
    .select('user_id, clinic_id, clinics(id, name, slug)')
    .in('role', ['vet_admin', 'veterinarian'])

  // First clinic per user (deterministic ordering not guaranteed — first seen wins)
  const clinicByUser = new Map<string, ClinicLink>()
  ;(links ?? []).forEach(l => {
    if (!clinicByUser.has(l.user_id)) clinicByUser.set(l.user_id, l as unknown as ClinicLink)
  })
  const vetUserIds = [...clinicByUser.keys()]

  let vetList: MarketplaceVet[] = []
  if (vetUserIds.length > 0) {
    let profileQuery = admin
      .from('profiles')
      .select('id, full_name, avatar_url, user_id')
      .in('user_id', vetUserIds)

    if (q) profileQuery = profileQuery.ilike('full_name', `%${q}%`)

    const { data: profiles } = await profileQuery.order('full_name')
    vetList = (profiles ?? []).map(p => {
      const link = clinicByUser.get(p.user_id)
      return {
        id:        p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        clinic_id: link?.clinic_id ?? null,
        clinics:   (link?.clinics as { id: string; name: string; slug: string } | null) ?? null,
      }
    })
  }

  return (
    <div>
      {/* Search bar */}
      <form method="GET" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre de veterinario..."
            style={{
              flex: 1,
              borderRadius: 10, border: '1px solid var(--pf-border)',
              padding: '9px 14px', fontSize: 14, color: 'var(--pf-ink)',
              fontFamily: 'var(--pf-font-body)', outline: 'none',
            }}
          />
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
      {vetList.length === 0 ? (
        <div
          style={{
            background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
            padding: '48px 20px', textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
            {q ? 'Sin resultados' : 'No hay veterinarios disponibles'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>
            {q ? `No encontramos veterinarios para "${q}"` : 'No hay veterinarios registrados en el marketplace'}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 12px' }}>
            {vetList.length} veterinario{vetList.length !== 1 ? 's' : ''} disponible{vetList.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {vetList.map(vet => (
              <MarketplaceVetCard key={vet.id} vet={vet} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
