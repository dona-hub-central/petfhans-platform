import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import VetLayout from '@/components/shared/VetLayout'
import VetConversationThread from '@/components/owner/OwnerConversationThread'
import VetConversationActions from '@/components/vet/VetConversationActions'

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

export default async function VetThreadPage({
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
    .select('id, role, full_name').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')
  if (!['vet_admin', 'veterinarian'].includes(profile.role)) redirect('/vet/dashboard')

  const { data: clinicLink } = await admin.from('profile_clinics')
    .select('clinic_id, clinics(name)').eq('user_id', user.id).limit(1).single()
  if (!clinicLink?.clinic_id) redirect('/vet/messages')
  const clinicName = (clinicLink?.clinics as unknown as { name?: string } | null)?.name ?? ''

  const { data: conversation } = await admin.from('conversations')
    .select(`
      id, subject, status, owner_id, clinic_id, pet_id,
      pets(id, name, species),
      clinics(id, name),
      profiles!conversations_owner_id_fkey(id, full_name)
    `)
    .eq('id', id)
    .eq('clinic_id', clinicLink.clinic_id)
    .single()

  if (!conversation) redirect('/vet/messages')

  const { data: messages } = await admin.from('conversation_messages')
    .select('id, sender_profile_id, sender_role, body, attachment_path, read_by_recipient, created_at, profiles(full_name)')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  // Mark unread messages from owner as read
  const unreadIds = (messages ?? [])
    .filter(m => !m.read_by_recipient && m.sender_profile_id !== profile.id)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await admin.from('conversation_messages')
      .update({ read_by_recipient: true })
      .in('id', unreadIds)
  }

  const conv = conversation as unknown as {
    id: string; subject: string; status: string
    owner_id: string; clinic_id: string; pet_id: string | null
    pets: { id: string; name: string } | null
    clinics: { id: string; name: string } | null
    profiles: { id: string; full_name: string } | null
  }
  const msgs = (messages ?? []) as unknown as MessageRow[]

  return (
    <VetLayout
      userName={profile.full_name ?? ''}
      clinicName={clinicName}
      role={profile.role}
      hasClinic={!!clinicLink.clinic_id}
    >
      <div style={{ padding: '24px 24px 32px', maxWidth: 800, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Link href="/vet/messages" style={{ display: 'flex', alignItems: 'center', color: 'var(--pf-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.subject}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--pf-muted)' }}>
              {conv.profiles?.full_name ?? 'Dueño'}{conv.pets ? ` · ${conv.pets.name}` : ''}
            </p>
          </div>

          {profile.role === 'vet_admin' && conv.status === 'open' && (
            <VetConversationActions conversationId={id} />
          )}
        </header>

        <VetConversationThread
          conversationId={id}
          initialMessages={msgs}
          myProfileId={profile.id}
          isClosed={conv.status !== 'open'}
        />
      </div>
    </VetLayout>
  )
}
