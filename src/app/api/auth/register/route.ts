import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOtpEmail } from '@/lib/email'
import { generateCode, createOtpToken } from '@/lib/otp'

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
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = full_name.trim()

    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      user_metadata: { role: 'pet_owner', full_name: normalizedName },
      email_confirm: false,
    })

    if (createError) {
      const msg = createError.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('unique')) {
        return NextResponse.json({ error: 'already_registered' }, { status: 409 })
      }
      console.error('[register] createUser error:', createError.message)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const code = generateCode()
    const token = createOtpToken(userData.user.id, normalizedEmail, normalizedName, code)

    const { error: emailError } = await sendOtpEmail({ to: normalizedEmail, name: normalizedName, code })

    if (emailError) {
      console.error('[register] sendOtpEmail error:', emailError)
      await admin.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json(
        { error: 'No se pudo enviar el email de verificación. Revisa tu dirección e intenta de nuevo.' },
        { status: 500 }
      )
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('pf_otp', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[register] unexpected error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
