import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json()

    if (!email?.trim() || !password || !full_name?.trim()) {
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()
    const redirectTo = `${req.nextUrl.origin}/auth/callback?next=/owner/setup`

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { role: 'pet_owner', full_name: full_name.trim() },
        redirectTo,
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
        return NextResponse.json({ error: 'already_registered' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await sendVerificationEmail({
      to: email.trim().toLowerCase(),
      name: full_name.trim(),
      verifyLink: data.properties.action_link,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
