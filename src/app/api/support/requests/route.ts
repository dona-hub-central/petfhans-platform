import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSupportRequestEmail, sendSupportRequestConfirmationEmail } from '@/lib/email'

const VALID_TYPES = ['clinic_creation', 'general'] as const
type RequestType = typeof VALID_TYPES[number]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const type: RequestType = body.type
  const subject = String(body.subject ?? '').trim()
  const message = String(body.message ?? '').trim()
  const clinic_name = body.clinic_name ? String(body.clinic_name).trim() : null
  const contact_phone = body.contact_phone ? String(body.contact_phone).trim() : null
  const contact_email = String(body.contact_email ?? user.email ?? '').trim().toLowerCase()

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }
  if (!subject || subject.length < 4) {
    return NextResponse.json({ error: 'El asunto es muy corto' }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'El mensaje es muy corto (mínimo 10 caracteres)' }, { status: 400 })
  }
  if (!contact_email || !contact_email.includes('@')) {
    return NextResponse.json({ error: 'Email de contacto inválido' }, { status: 400 })
  }
  if (type === 'clinic_creation' && !clinic_name) {
    return NextResponse.json({ error: 'Indica el nombre de la clínica' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Throttle: máx 5 solicitudes pendientes por usuario para evitar spam
  const { count } = await admin.from('support_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Tienes demasiadas solicitudes pendientes. Espera respuesta antes de enviar otra.' },
      { status: 429 }
    )
  }

  const { data: profile } = await admin.from('profiles')
    .select('full_name').eq('user_id', user.id).single()
  const fullName = profile?.full_name ?? user.email ?? 'Usuario'

  const { data: created, error: insertErr } = await admin.from('support_requests').insert({
    user_id: user.id,
    type,
    subject,
    message,
    clinic_name,
    contact_phone,
    contact_email,
  }).select('id').single()

  if (insertErr) {
    console.error('[support] insert error:', insertErr.message)
    return NextResponse.json({ error: 'No se pudo registrar la solicitud' }, { status: 500 })
  }

  // Best-effort emails (no rollback si fallan; el registro queda en la BD)
  try {
    await sendSupportRequestEmail({
      type,
      subject,
      message,
      fromName: fullName,
      fromEmail: contact_email,
      contactPhone: contact_phone ?? undefined,
      clinicName: clinic_name ?? undefined,
    })
  } catch (e) {
    console.error('[support] notify email error:', e)
  }
  try {
    await sendSupportRequestConfirmationEmail({ to: contact_email, name: fullName, type })
  } catch (e) {
    console.error('[support] confirmation email error:', e)
  }

  return NextResponse.json({ success: true, id: created.id })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('role').eq('user_id', user.id).single()

  const query = admin.from('support_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = profile?.role === 'superadmin'
    ? await query
    : await query.eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
