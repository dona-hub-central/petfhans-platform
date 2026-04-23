import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// H-6: rate limiting en memoria — máx 10 intentos por IP por 15 minutos
// En producción migrar a Redis para persistencia entre instancias
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) return false
    entry.count++
  } else {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  }
  return true
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data: inv } = await admin
    .from('invitations')
    .select('id, email, role, expires_at, used_at, clinic_id, pet_id, pet_ids, clinics(name, slug), pets(name)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!inv) return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 404 })

  return NextResponse.json({ invitation: inv })
}
