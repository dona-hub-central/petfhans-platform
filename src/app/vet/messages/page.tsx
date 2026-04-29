import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Clock } from 'lucide-react'
import VetLayout from '@/components/shared/VetLayout'

export const metadata = { title: 'Mensajes · Petfhans Vet' }

type ConversationRow = {
  id: string
  subject: string
  status: string
  last_message_at: string
  pet_id: string | null
  pets: { name: string } | null
  clinics: { id: string; name: string } | null
  profiles: { id: string; full_name: string } | null
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  const d = Math.floor(diff / 86400)
  return `hace ${d} día${d > 1 ? 's' : ''}`
}

export default async function VetMessagesPage() {
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

  const clinicId   = clinicLink?.clinic_id
  const clinicName = (clinicLink?.clinics as unknown as { name?: string } | null)?.name ?? ''

  const { data: rows } = clinicId
    ? await admin.from('conversations')
        .select(`
          id, subject, status, last_message_at, pet_id,
          pets(name),
          clinics(id, name),
          profiles!conversations_owner_id_fkey(id, full_name)
        `)
        .eq('clinic_id', clinicId)
        .order('last_message_at', { ascending: false })
        .limit(40)
    : { data: [] }

  const conversations = (rows ?? []) as unknown as ConversationRow[]

  const statusOptions = [
    { value: 'open',     label: 'Abiertos' },
    { value: 'closed',   label: 'Cerrados' },
    { value: 'archived', label: 'Archivados' },
  ] as const

  type StatusKey = typeof statusOptions[number]['value']
  const grouped: Record<StatusKey, ConversationRow[]> = {
    open:     conversations.filter(c => c.status === 'open'),
    closed:   conversations.filter(c => c.status === 'closed'),
    archived: conversations.filter(c => c.status === 'archived'),
  }

  return (
    <VetLayout
      userName={profile.full_name ?? ''}
      clinicName={clinicName}
      role={profile.role}
      hasClinic={!!clinicId}
    >
      <div style={{ padding: '24px 24px 32px', maxWidth: 800, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ font: 'var(--pf-text-display)', margin: 0, color: 'var(--pf-ink)', fontSize: 26 }}>Mensajes</h1>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '4px 0 0' }}>
            Conversaciones de dueños con la clínica
          </p>
        </header>

        {!clinicId ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <MessageSquare size={40} style={{ color: 'var(--pf-muted)', marginBottom: 12 }} strokeWidth={1.5} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--pf-ink)', margin: '0 0 8px' }}>Sin clínica asignada</p>
            <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>Necesitas pertenecer a una clínica para ver los mensajes.</p>
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <MessageSquare size={40} style={{ color: 'var(--pf-muted)', marginBottom: 12 }} strokeWidth={1.5} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--pf-ink)', margin: '0 0 8px' }}>Sin mensajes aún</p>
            <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>Los dueños vinculados a la clínica aparecerán aquí cuando inicien una conversación.</p>
          </div>
        ) : (
          <>
            {statusOptions.map(({ value, label }) =>
              grouped[value].length === 0 ? null : (
                <div key={value} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 2px 10px' }}>
                    {label} · {grouped[value].length}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {grouped[value].map(conv => (
                      <Link key={conv.id} href={`/vet/messages/${conv.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          background: 'var(--pf-white)', borderRadius: 14,
                          padding: '14px 16px',
                          border: '1px solid var(--pf-border)',
                          display: 'flex', alignItems: 'center', gap: 14,
                          transition: 'border-color .15s',
                        }}>
                          {/* Owner avatar */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                            background: 'linear-gradient(135deg, #EE726D, #f87171)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 18,
                          }}>
                            {conv.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {conv.profiles?.full_name ?? 'Dueño'}
                              </p>
                              <span style={{ fontSize: 11, color: 'var(--pf-muted)', flexShrink: 0, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={10} />
                                {timeAgo(conv.last_message_at)}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {conv.subject}
                            </p>
                            {conv.pets && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--pf-muted)' }}>
                                Sobre {conv.pets.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </VetLayout>
  )
}
