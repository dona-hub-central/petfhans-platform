import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Clock } from 'lucide-react'

export const metadata = { title: 'Mensajes · Petfhans' }

type ConversationRow = {
  id: string
  subject: string
  status: string
  last_message_at: string
  pet_id: string | null
  pets: { name: string; species: string } | null
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

export default async function OwnerMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  // Check if owner has any clinic link (to determine orphan state)
  const { data: clinicLinks } = await admin.from('profile_clinics')
    .select('clinic_id').eq('user_id', user.id).limit(1)
  const hasClinic = (clinicLinks?.length ?? 0) > 0

  const { data: rows } = await admin.from('conversations')
    .select(`
      id, subject, status, last_message_at, pet_id,
      pets(name, species),
      clinics(id, name),
      profiles!conversations_owner_id_fkey(id, full_name)
    `)
    .eq('owner_id', profile.id)
    .order('last_message_at', { ascending: false })
    .limit(40)

  const conversations = (rows ?? []) as unknown as ConversationRow[]

  return (
    <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 16px 24px', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: 'var(--pf-text-display)', margin: 0, color: 'var(--pf-ink)', fontSize: 26 }}>Mensajes</h1>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '4px 0 0' }}>
            {conversations.filter(c => c.status === 'open').length} activos
          </p>
        </div>
        {hasClinic && (
          <Link href="/owner/messages/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'var(--pf-coral)', color: '#fff',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>
            <Plus size={14} strokeWidth={2.5} />
            Nuevo
          </Link>
        )}
      </header>

      {!hasClinic ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <MessageSquare size={40} style={{ color: 'var(--pf-muted)', marginBottom: 12 }} strokeWidth={1.5} />
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 8px' }}>
            Aún no puedes enviar mensajes
          </p>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '0 0 20px' }}>
            Para conversar con una clínica primero debes solicitar atención a través del marketplace
          </p>
          <Link href="/marketplace/clinicas" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '12px 20px', borderRadius: 12,
            background: 'var(--pf-coral)', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 700,
          }}>
            Buscar clínica →
          </Link>
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <MessageSquare size={40} style={{ color: 'var(--pf-muted)', marginBottom: 12 }} strokeWidth={1.5} />
          <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 8px' }}>
            No tienes mensajes aún
          </p>
          <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '0 0 20px' }}>
            Inicia una conversación con tu clínica sobre tus mascotas
          </p>
          <Link href="/owner/messages/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '12px 20px', borderRadius: 12,
            background: 'var(--pf-coral)', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 700,
          }}>
            <Plus size={14} strokeWidth={2.5} />
            Nuevo mensaje
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conversations.map(conv => (
            <Link key={conv.id} href={`/owner/messages/${conv.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--pf-white)', borderRadius: 14,
                padding: '14px 16px',
                border: '1px solid var(--pf-border)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {/* Clinic avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 18,
                }}>
                  {conv.clinics?.name?.[0]?.toUpperCase() ?? '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.clinics?.name ?? 'Clínica'}
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

                <div style={{ flexShrink: 0 }}>
                  {conv.status === 'closed' ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 20 }}>
                      Cerrado
                    </span>
                  ) : conv.status === 'archived' ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 20 }}>
                      Archivado
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
