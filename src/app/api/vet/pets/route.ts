import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !['vet_admin', 'veterinarian'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: clinicLink } = await admin
    .from('profile_clinics')
    .select('clinic_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!clinicLink?.clinic_id) return NextResponse.json({ pets: [] })

  const { data: pets } = await admin
    .from('pets')
    .select('id, name, species')
    .eq('clinic_id', clinicLink.clinic_id)
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({ pets: pets ?? [] })
}
