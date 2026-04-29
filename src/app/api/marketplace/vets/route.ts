import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const url = req.nextUrl
  const q = url.searchParams.get('q') ?? ''
  const clinicId = url.searchParams.get('clinic_id') ?? ''

  // Fetch vet–clinic links from profile_clinics (profiles.clinic_id nullified in migration 019)
  let linksQuery = admin
    .from('profile_clinics')
    .select('user_id, clinic_id, clinics(id, name, slug)')
    .in('role', ['vet_admin', 'veterinarian'])

  if (clinicId) linksQuery = linksQuery.eq('clinic_id', clinicId)

  const { data: links, error: linksErr } = await linksQuery
  if (linksErr) return NextResponse.json({ error: 'Error al buscar veterinarios' }, { status: 500 })

  type ClinicLink = { user_id: string; clinic_id: string; clinics: { id: string; name: string; slug: string } | null }
  const clinicByUser = new Map<string, ClinicLink>()
  ;(links ?? []).forEach(l => {
    if (!clinicByUser.has(l.user_id)) clinicByUser.set(l.user_id, l as unknown as ClinicLink)
  })
  const vetUserIds = [...clinicByUser.keys()]

  if (vetUserIds.length === 0) return NextResponse.json({ data: [] })

  let profileQuery = admin
    .from('profiles')
    .select('id, full_name, avatar_url, user_id')
    .in('user_id', vetUserIds)
    .order('full_name')

  if (q) profileQuery = profileQuery.ilike('full_name', `%${q}%`)

  const { data: profiles, error: profilesErr } = await profileQuery.limit(100)
  if (profilesErr) return NextResponse.json({ error: 'Error al buscar veterinarios' }, { status: 500 })

  const vets = (profiles ?? []).map(p => {
    const link = clinicByUser.get(p.user_id)
    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      clinic_id: link?.clinic_id ?? null,
      clinics: (link?.clinics as { id: string; name: string; slug: string } | null) ?? null,
    }
  })

  return NextResponse.json({ data: vets })
}
