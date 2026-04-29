import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import OwnerConversationThread from '@/components/owner/OwnerConversationThread'

export const dynamic = 'force-dynamic'

type MessageRow = {
  id: string
  sender_profile_id: string
  sender_role: string
  body: string
  attachment_path: string | null
  read_by_recipient: boolean
  created_at: string
  profiles: { full_name: string } | null
}

type ConversationDetail = {
  id: string
  subject: string
  status: string
  owner_id: string
  clinic_id: string
  pet_id: string | null
  pets: { id: string; name: string; species: string } | null
  clinics: { id: string; name: string } | null
}

export default async function OwnerThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: conversation } = await admin.from('conversations')
    .select(`
      id, subject, status, owner_id, clinic_id, pet_id,
      pets(id, name, species),
      clinics(id, name)
    `)
    .eq('id', id)
    .eq('owner_id', profile.id)
    .single()

  if (!conversation) redirect('/owner/messages')

  const { data: messages } = await admin.from('conversation_messages')
    .select('id, sender_profile_id, sender_role, body, attachment_path, read_by_recipient, created_at, profiles(full_name)')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  // Mark unread messages from clinic as read
  const unreadIds = (messages ?? [])
    .filter(m => !m.read_by_recipient && m.sender_profile_id !== profile.id)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await admin.from('conversation_messages')
      .update({ read_by_recipient: true })
      .in('id', unreadIds)
  }

  const conv = conversation as unknown as ConversationDetail
  const msgs = (messages ?? []) as unknown as MessageRow[]

  return (
    <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 16px 24px', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/owner/messages" style={{ display: 'flex', alignItems: 'center', color: 'var(--pf-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.subject}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--pf-muted)' }}>
            {conv.clinics?.name}{conv.pets ? ` · ${conv.pets.name}` : ''}
            {conv.status !== 'open' && (
              <span style={{ marginLeft: 8, fontWeight: 600, color: '#6b7280' }}>
                · {conv.status === 'closed' ? 'Cerrado' : 'Archivado'}
              </span>
            )}
          </p>
        </div>
      </header>

      <OwnerConversationThread
        conversationId={id}
        initialMessages={msgs}
        myProfileId={profile.id}
        isClosed={conv.status !== 'open'}
      />
    </div>
  )
}
