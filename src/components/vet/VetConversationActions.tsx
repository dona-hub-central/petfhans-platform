'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, CheckCircle, Archive } from 'lucide-react'

export default function VetConversationActions({ conversationId }: { conversationId: string }) {
  const router  = useRouter()
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)

  const changeStatus = async (status: 'closed' | 'archived') => {
    setOpen(false); setLoading(true)
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--pf-border)',
          background: 'var(--pf-white)', fontSize: 13, fontWeight: 600,
          color: 'var(--pf-ink)', cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Guardando…' : 'Acciones'}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          background: '#fff', borderRadius: 12,
          border: '1px solid var(--pf-border)',
          boxShadow: '0 8px 24px rgba(0,0,0,.1)',
          zIndex: 50, minWidth: 160, padding: 6,
        }}>
          <button
            onClick={() => changeStatus('closed')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', border: 'none', background: 'transparent',
              borderRadius: 8, fontSize: 13, color: 'var(--pf-ink)',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            Cerrar hilo
          </button>
          <button
            onClick={() => changeStatus('archived')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', border: 'none', background: 'transparent',
              borderRadius: 8, fontSize: 13, color: 'var(--pf-ink)',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            <Archive size={14} style={{ color: '#6b7280' }} />
            Archivar
          </button>
        </div>
      )}

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
