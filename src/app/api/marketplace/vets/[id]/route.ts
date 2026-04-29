import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: vet, error } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role, phone, user_id')
    .eq('id', id)
    .in('role', ['vet_admin', 'veterinarian'])
    .single()

  if (error || !vet) return NextResponse.json({ error: 'Veterinario no encontrado' }, { status: 404 })

  // Get clinic via profile_clinics (profiles.clinic_id nullified in migration 019)
  const { data: link } = await admin
    .from('profile_clinics')
    .select('clinic_id, clinics(id, name, slug, verified, public_profile)')
    .eq('user_id', vet.user_id)
    .in('role', ['vet_admin', 'veterinarian'])
    .limit(1)
    .single()

  if (!link?.clinic_id) return NextResponse.json({ error: 'Veterinario no disponible' }, { status: 404 })

  return NextResponse.json({ data: { ...vet, clinic_id: link.clinic_id, clinics: link.clinics } })
}
