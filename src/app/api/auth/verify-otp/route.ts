import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtpToken } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    const token = req.cookies.get('pf_otp')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Sesión expirada. Regístrate de nuevo.' },
        { status: 400 }
      )
    }

    const result = verifyOtpToken(token, String(code).trim())
    if (!result) {
      return NextResponse.json({ error: 'Código incorrecto o expirado.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: updateError } = await admin.auth.admin.updateUserById(result.userId, {
      email_confirm: true,
    })

    if (updateError) {
      console.error('[verify-otp] updateUserById error:', updateError.message)
      return NextResponse.json({ error: 'Error al activar la cuenta.' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, email: result.email })
    res.cookies.delete('pf_otp')
    return res
  } catch (e) {
    console.error('[verify-otp] unexpected error:', e)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
