import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewMessageToClinicEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const CreateSchema = z.object({
  clinic_id: z.string().uuid(),
  pet_id:    z.string().uuid().optional(),
  subject:   z.string().min(1).max(200).trim(),
  body:      z.string().min(1).max(5000).trim(),
})

// POST /api/conversations — create a new thread + first message
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, full_name, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  if (profile.role !== 'pet_owner') {
    return NextResponse.json({ error: 'Solo dueños pueden crear conversaciones' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { clinic_id, pet_id, subject, body: messageBody } = parsed.data

  // Owner must belong to the clinic
  const { data: clinicLink } = await admin.from('profile_clinics')
    .select('clinic_id').eq('user_id', user.id).eq('clinic_id', clinic_id).maybeSingle()
  if (!clinicLink) {
    return NextResponse.json({ error: 'No perteneces a esta clínica' }, { status: 403 })
  }

  const { data: conversation, error: convErr } = await admin.from('conversations').insert({
    owner_id:  profile.id,
    clinic_id,
    pet_id:    pet_id ?? null,
    subject,
  }).select().single()

  if (convErr) {
    return NextResponse.json({ error: 'Error al crear la conversación' }, { status: 500 })
  }

  const { data: message, error: msgErr } = await admin.from('conversation_messages').insert({
    conversation_id:   conversation.id,
    sender_profile_id: profile.id,
    sender_role:       'pet_owner',
    body:              messageBody,
  }).select().single()

  if (msgErr) {
    await admin.from('conversations').delete().eq('id', conversation.id)
    return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500 })
  }

  // Email to vet_admin of the clinic
  try {
    const [{ data: clinic }, { data: vetAdminLinks }] = await Promise.all([
      admin.from('clinics').select('name').eq('id', clinic_id).single(),
      admin.from('profile_clinics').select('user_id').eq('clinic_id', clinic_id).eq('role', 'vet_admin'),
    ])

    let petName: string | undefined
    if (pet_id) {
      const { data: pet } = await admin.from('pets').select('name').eq('id', pet_id).single()
      petName = pet?.name
    }

    const vetUserIds = (vetAdminLinks ?? []).map(v => v.user_id)
    if (vetUserIds.length > 0) {
      const { data: vetProfiles } = await admin.from('profiles')
        .select('email').in('user_id', vetUserIds)
      for (const vp of vetProfiles ?? []) {
        await sendNewMessageToClinicEmail({
          to:         vp.email,
          ownerName:  profile.full_name ?? 'Un dueño',
          clinicName: clinic?.name ?? 'tu clínica',
          petName,
          subject,
          preview:    messageBody.slice(0, 200),
          threadUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/vet/messages/${conversation.id}`,
        })
      }
    }
  } catch (err) {
    console.error('[conversations] email notification failed:', err)
  }

  return NextResponse.json({ conversation, message }, { status: 201 })
}

// GET /api/conversations — list conversations for the authenticated user
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const status = searchParams.get('status') ?? 'open'
  const from   = page * 20
  const to     = from + 19

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  let query = admin.from('conversations')
    .select(`
      id, subject, status, last_message_at, created_at,
      pet_id,
      pets(name, species),
      clinics(id, name),
      profiles!conversations_owner_id_fkey(id, full_name),
      unread_count:conversation_messages(count)
    `)
    .eq('status', status)
    .order('last_message_at', { ascending: false })
    .range(from, to)

  if (profile.role === 'pet_owner') {
    query = query.eq('owner_id', profile.id)
  } else if (['vet_admin', 'veterinarian'].includes(profile.role)) {
    const { data: clinicLink } = await admin.from('profile_clinics')
      .select('clinic_id').eq('user_id', user.id).limit(1).single()
    if (!clinicLink?.clinic_id) return NextResponse.json({ conversations: [] })
    query = query.eq('clinic_id', clinicLink.clinic_id)
  } else {
    return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 })
  }

  const { data: conversations, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ conversations: conversations ?? [] })
}
