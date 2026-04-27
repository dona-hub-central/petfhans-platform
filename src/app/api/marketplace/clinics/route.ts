import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const url = req.nextUrl
  const q = url.searchParams.get('q') ?? ''
  const verifiedOnly = url.searchParams.get('verified') === 'true'

  // Find clinic IDs this user is blocked from (pet_owners only)
  const blockedIds: string[] = []
  if (profile.role === 'pet_owner') {
    const { data: blocks } = await admin
      .from('clinic_blocks')
      .select('clinic_id')
      .eq('owner_id', profile.id)
    blocks?.forEach(b => blockedIds.push(b.clinic_id))
  }

  // Find clinic IDs the user is already linked to
  const linkedIds: string[] = []
  if (profile.role === 'pet_owner') {
    const { data: access } = await admin
      .from('pet_access')
      .select('clinic_id')
      .eq('owner_id', profile.id)
    access?.forEach(a => {
      if (!linkedIds.includes(a.clinic_id)) linkedIds.push(a.clinic_id)
    })
  } else {
    const { data: links } = await admin
      .from('profile_clinics').select('clinic_id').eq('user_id', user.id)
    links?.forEach((l: { clinic_id: string }) => { if (!linkedIds.includes(l.clinic_id)) linkedIds.push(l.clinic_id) })
  }

  const excludeIds = [...new Set([...blockedIds, ...linkedIds])]

  let query = admin
    .from('clinics')
    .select('id, name, slug, verified')
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)
  if (verifiedOnly) query = query.eq('verified', true)
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: clinics, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: 'Error al buscar clínicas' }, { status: 500 })

  return NextResponse.json({ data: clinics ?? [] })
}
