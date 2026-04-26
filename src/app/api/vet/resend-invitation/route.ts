import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const activeClinicId = req.headers.get('x-active-clinic-id')
    if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

    const { invitation_id } = await req.json()
    const admin = createAdminClient()

    // Extender expiración 7 días
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 7)

    // H-10: filtrar por clinic_id para impedir manipular invitaciones ajenas
    const { data: inv, error } = await admin.from('invitations')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', invitation_id)
      .eq('clinic_id', activeClinicId)
      .is('used_at', null)
      .select('*, pets(name), clinics(name)')
      .single()

    if (error || !inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })

    const { data: clinic } = await admin.from('clinics')
      .select('slug, name').eq('id', activeClinicId).single()

    const inviteLink = `https://petfhans.com/auth/invite?token=${inv.token}`

    type InvWithPet = typeof inv & { pets: { name: string } | null }
    await sendInvitationEmail({
      to:         inv.email,
      clinicName: clinic?.name ?? 'Petfhans',
      petName:    (inv as InvWithPet).pets?.name,
      role:       inv.role,
      inviteLink,
      expiresAt:  inv.expires_at,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resend error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
