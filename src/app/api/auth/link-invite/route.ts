import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Links an invitation to an already-authenticated user.
// Accepts ONLY the token — email, role and clinic_id come from the DB (sealed-envelope model).
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: inv } = await admin
    .from('invitations')
    .select('*, clinics(name, slug)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!inv) return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 404 })

  // Ownership: the logged-in user must own the invited email
  if (user.email?.toLowerCase() !== inv.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Esta invitación es para otro correo electrónico' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // Link user to clinic via profile_clinics
  await admin.from('profile_clinics').upsert(
    { user_id: user.id, clinic_id: inv.clinic_id, role: inv.role },
    { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
  )

  // Grant pet_access for pet_owner invitations
  if (inv.role === 'pet_owner') {
    const petRows: Array<{ owner_id: string; pet_id: string; clinic_id: string; linked_by: string }> = []

    if (inv.pet_id) {
      petRows.push({ owner_id: profile.id, pet_id: inv.pet_id, clinic_id: inv.clinic_id, linked_by: inv.created_by ?? profile.id })
    }
    if (Array.isArray(inv.pet_ids) && inv.pet_ids.length > 0) {
      for (const pet_id of inv.pet_ids as string[]) {
        if (!petRows.some(r => r.pet_id === pet_id)) {
          petRows.push({ owner_id: profile.id, pet_id, clinic_id: inv.clinic_id, linked_by: inv.created_by ?? profile.id })
        }
      }
    }
    if (petRows.length > 0) {
      await admin.from('pet_access').upsert(petRows, { onConflict: 'owner_id,pet_id' })
    }
  }

  // Mark invitation as used
  await admin.from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', inv.id)

  return NextResponse.json({ success: true, role: inv.role })
}
