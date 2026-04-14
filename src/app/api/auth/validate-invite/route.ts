import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data: inv } = await admin
    .from('invitations')
    .select('id, email, role, expires_at, used_at, clinic_id, pet_id, clinics(name, slug), pets(name)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!inv) return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 404 })

  return NextResponse.json({ invitation: inv })
}
