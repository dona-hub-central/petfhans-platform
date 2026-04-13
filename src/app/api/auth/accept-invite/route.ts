import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { token, full_name, password, email } = await req.json()
    const admin = createAdminClient()

    // Validar invitación
    const { data: inv } = await admin.from('invitations')
      .select('*, clinics(name, slug)')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!inv) return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 400 })

    // Crear usuario en Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: inv.role, full_name, clinic_id: inv.clinic_id },
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Crear perfil
    await admin.from('profiles').upsert({
      user_id:   authData.user.id,
      role:      inv.role,
      full_name,
      email,
      clinic_id: inv.clinic_id,
    }, { onConflict: 'user_id' })

    // Marcar invitación como usada
    await admin.from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', inv.id)

    // Email de bienvenida
    const slug = (inv as any).clinics?.slug
    await sendWelcomeEmail({
      to:         email,
      name:       full_name,
      clinicName: (inv as any).clinics?.name ?? 'Petfhans',
      loginUrl:   `https://${slug}.petfhans.com/auth/login`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
