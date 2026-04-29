import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewMessageToOwnerEmail, sendNewMessageToClinicEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  body:            z.string().min(1).max(5000).trim(),
  attachment_path: z.string().optional(),
})

// POST /api/conversations/[id]/messages — send a message to a thread
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, full_name, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // Fetch and verify conversation access
  const { data: conversation } = await admin.from('conversations')
    .select('id, status, owner_id, clinic_id, subject, pets(name)')
    .eq('id', id)
    .single()

  if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  if (conversation.status !== 'open') {
    return NextResponse.json({ error: 'Esta conversación está cerrada' }, { status: 409 })
  }

  const isOwner = conversation.owner_id === profile.id
  let isClinicStaff = false
  if (['vet_admin', 'veterinarian'].includes(profile.role)) {
    const { data: clinicLink } = await admin.from('profile_clinics')
      .select('clinic_id').eq('user_id', user.id).eq('clinic_id', conversation.clinic_id).maybeSingle()
    isClinicStaff = !!clinicLink
  }

  if (!isOwner && !isClinicStaff) {
    return NextResponse.json({ error: 'Sin acceso a esta conversación' }, { status: 403 })
  }

  const senderRole = profile.role as 'pet_owner' | 'veterinarian' | 'vet_admin'

  const { data: message, error: msgErr } = await admin.from('conversation_messages').insert({
    conversation_id:   id,
    sender_profile_id: profile.id,
    sender_role:       senderRole,
    body:              parsed.data.body,
    attachment_path:   parsed.data.attachment_path ?? null,
  }).select().single()

  if (msgErr) {
    return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500 })
  }

  // Email notification to the other side
  try {
    const { data: clinic } = await admin.from('clinics')
      .select('name').eq('id', conversation.clinic_id).single()
    const petName = (conversation.pets as { name?: string } | null)?.name

    if (senderRole === 'pet_owner') {
      // Notify vet_admin of the clinic
      const { data: vetAdminLinks } = await admin.from('profile_clinics')
        .select('user_id').eq('clinic_id', conversation.clinic_id).eq('role', 'vet_admin')
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
            subject:    conversation.subject,
            preview:    parsed.data.body.slice(0, 200),
            threadUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/vet/messages/${id}`,
          })
        }
      }
    } else {
      // Notify the owner
      const { data: ownerProfile } = await admin.from('profiles')
        .select('email, full_name').eq('id', conversation.owner_id).single()
      if (ownerProfile?.email) {
        await sendNewMessageToOwnerEmail({
          to:         ownerProfile.email,
          ownerName:  ownerProfile.full_name ?? 'Hola',
          clinicName: clinic?.name ?? 'tu clínica',
          petName,
          subject:    conversation.subject,
          preview:    parsed.data.body.slice(0, 200),
          threadUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/owner/messages/${id}`,
        })
      }
    }
  } catch (err) {
    console.error('[conversations/messages] email notification failed:', err)
  }

  return NextResponse.json({ message }, { status: 201 })
}
