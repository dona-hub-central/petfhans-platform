import { NextRequest, NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email'
import { generateCode, createOtpToken, decodeOtpToken } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pf_otp')?.value
    if (!token) {
      return NextResponse.json({ error: 'Sesión expirada. Regístrate de nuevo.' }, { status: 400 })
    }

    const decoded = decodeOtpToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 400 })
    }

    const code = generateCode()
    const newToken = createOtpToken(decoded.userId, decoded.email, decoded.name, code)

    const { error: emailError } = await sendOtpEmail({
      to: decoded.email,
      name: decoded.name,
      code,
    })

    if (emailError) {
      console.error('[resend-otp] sendOtpEmail error:', emailError)
      return NextResponse.json({ error: 'Error al enviar el email.' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('pf_otp', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[resend-otp] unexpected error:', e)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
