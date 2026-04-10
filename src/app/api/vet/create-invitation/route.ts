import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles')
      .select('id, clinic_id').eq('user_id', user.id).single()

    const { email, role, pet_id } = await req.json()
    const admin = createAdminClient()

    // Crear invitación
    const { data: inv, error } = await admin.from('invitations')
      .insert({
        clinic_id:  profile!.clinic_id,
        email,
        role,
        pet_id:     pet_id || null,
        created_by: profile!.id,
      })
      .select('*, pets(name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Obtener datos de la clínica
    const { data: clinic } = await admin.from('clinics')
      .select('slug, name').eq('id', profile!.clinic_id).single()

    const inviteLink = `https://${clinic?.slug}.petfhans.com/auth/invite?token=${inv.token}`

    // Enviar email
    await sendInvitationEmail({
      to:         email,
      clinicName: clinic?.name ?? 'Petfhans',
      petName:    inv.pets?.name,
      role,
      inviteLink,
      expiresAt:  inv.expires_at,
    })

    return NextResponse.json({ success: true, invitation_id: inv.id })
  } catch (err: any) {
    console.error('Invitation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
