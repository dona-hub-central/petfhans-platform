'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

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

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function OwnerConversationThread({
  conversationId,
  initialMessages,
  myProfileId,
  isClosed,
}: {
  conversationId: string
  initialMessages: MessageRow[]
  myProfileId: string
  isClosed: boolean
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending || isClosed) return
    setSending(true); setError('')
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: trimmed }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al enviar')
      setSending(false)
      return
    }
    setMessages(prev => [...prev, data.message])
    setBody('')
    setSending(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  // Group messages by date
  const groups: { date: string; items: MessageRow[] }[] = []
  for (const msg of messages) {
    const dateLabel = formatDate(msg.created_at)
    const last = groups[groups.length - 1]
    if (last && last.date === dateLabel) {
      last.items.push(msg)
    } else {
      groups.push({ date: dateLabel, items: [msg] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 180px)' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--pf-muted)', fontSize: 13, marginTop: 24 }}>
            No hay mensajes aún. Sé el primero en escribir.
          </p>
        )}

        {groups.map(group => (
          <div key={group.date}>
            <div style={{ textAlign: 'center', margin: '16px 0 12px' }}>
              <span style={{ fontSize: 11, color: 'var(--pf-muted)', background: 'var(--pf-surface)', padding: '4px 10px', borderRadius: 20 }}>
                {group.date}
              </span>
            </div>

            {group.items.map(msg => {
              const isMine = msg.sender_profile_id === myProfileId
              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  marginBottom: 8, paddingLeft: isMine ? 48 : 0, paddingRight: isMine ? 0 : 48,
                }}>
                  <div style={{
                    maxWidth: '80%',
                    background: isMine ? 'var(--pf-coral)' : 'var(--pf-surface)',
                    color: isMine ? '#fff' : 'var(--pf-ink)',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '10px 14px',
                  }}>
                    {!isMine && (
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6366f1' }}>
                        {msg.profiles?.full_name ?? 'Clínica'}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.body}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7, textAlign: 'right' }}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {isClosed ? (
        <div style={{
          background: 'var(--pf-surface)', borderRadius: 12,
          padding: '12px 16px', textAlign: 'center',
          border: '1px solid var(--pf-border)',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-muted)' }}>
            Esta conversación está cerrada
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          background: 'var(--pf-white)', borderRadius: 16,
          border: '1.5px solid var(--pf-border)',
          padding: '8px 8px 8px 14px',
          position: 'sticky', bottom: 16,
        }}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            rows={1}
            maxLength={5000}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontSize: 14, fontFamily: 'inherit', color: 'var(--pf-ink)',
              background: 'transparent', lineHeight: 1.5, maxHeight: 160,
              padding: '4px 0',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              border: 'none', background: body.trim() ? 'var(--pf-coral)' : 'var(--pf-border)',
              color: body.trim() ? '#fff' : 'var(--pf-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: body.trim() && !sending ? 'pointer' : 'default',
              transition: 'background .15s',
            }}
            aria-label="Enviar"
          >
            <Send size={16} />
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0', fontWeight: 600 }}>{error}</p>
      )}
    </div>
  )
}
