import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  status: z.enum(['open', 'closed', 'archived']),
})

// GET /api/conversations/[id] — thread detail with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  // Fetch conversation with access check
  const { data: conversation } = await admin.from('conversations')
    .select(`
      id, subject, status, last_message_at, created_at,
      owner_id, clinic_id, pet_id,
      pets(id, name, species),
      clinics(id, name),
      profiles!conversations_owner_id_fkey(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

  // Access check
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

  // Fetch messages
  const { searchParams } = new URL(req.url)
  const before = searchParams.get('before') // ISO timestamp for cursor pagination
  let msgQuery = admin.from('conversation_messages')
    .select('id, sender_profile_id, sender_role, body, attachment_path, read_by_recipient, created_at, profiles(full_name)')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  if (before) {
    msgQuery = msgQuery.lt('created_at', before)
  }

  const { data: messages } = await msgQuery

  // Mark unread messages as read for this user
  const unreadIds = (messages ?? [])
    .filter(m => !m.read_by_recipient && m.sender_profile_id !== profile.id)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await admin.from('conversation_messages')
      .update({ read_by_recipient: true })
      .in('id', unreadIds)
  }

  return NextResponse.json({ conversation, messages: messages ?? [] })
}

// PATCH /api/conversations/[id] — change status (vet_admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Solo vet_admin puede cambiar el estado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  // Verify conversation belongs to admin's clinic
  const { data: clinicLink } = await admin.from('profile_clinics')
    .select('clinic_id').eq('user_id', user.id).limit(1).single()
  if (!clinicLink?.clinic_id) {
    return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
  }

  const { data: updated, error } = await admin.from('conversations')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .eq('clinic_id', clinicLink.clinic_id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'No se pudo actualizar la conversación' }, { status: 404 })
  }

  return NextResponse.json({ conversation: updated })
}
