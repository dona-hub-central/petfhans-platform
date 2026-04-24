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
    .select('id, full_name, avatar_url, role, clinic_id, phone, clinics(id, name, slug, verified, public_profile)')
    .eq('id', id)
    .in('role', ['vet_admin', 'veterinarian'])
    .single()

  if (error || !vet) return NextResponse.json({ error: 'Veterinario no encontrado' }, { status: 404 })
  if (!vet.clinic_id) return NextResponse.json({ error: 'Veterinario no disponible' }, { status: 404 })

  return NextResponse.json({ data: vet })
}
