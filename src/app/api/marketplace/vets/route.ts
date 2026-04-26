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

  let query = admin
    .from('profiles')
    .select('id, full_name, avatar_url, role, clinic_id, clinics(id, name, slug)')
    .in('role', ['vet_admin', 'veterinarian'])
    .not('clinic_id', 'is', null)
    .order('full_name')

  if (q) query = query.ilike('full_name', `%${q}%`)
  if (clinicId) query = query.eq('clinic_id', clinicId)

  const { data: vets, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: 'Error al buscar veterinarios' }, { status: 500 })

  return NextResponse.json({ data: vets ?? [] })
}
