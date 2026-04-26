'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Ban, Loader2, type LucideIcon } from 'lucide-react'

interface CareRequestActionsProps {
  id: string
  type: 'care'
}

interface JoinRequestActionsProps {
  id: string
  type: 'join'
}

type Props = CareRequestActionsProps | JoinRequestActionsProps

export default function RequestActions({ id, type }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function act(action: string) {
    setLoading(action)
    setError('')

    const url = type === 'care'
      ? `/api/care-requests/${id}`
      : `/api/clinic-join-requests/${id}`

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Error al procesar')
      setLoading(null)
      return
    }

    setDone(true)
    setLoading(null)
    router.refresh()
  }

  if (done) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: 'var(--pf-success-fg)',
        background: 'var(--pf-success)', padding: '4px 10px',
        borderRadius: 'var(--pf-r-pill)',
      }}>
        Procesado
      </span>
    )
  }

  const btn = (action: string, label: string, Icon: LucideIcon, style: CSSProperties) => (
    <button
      onClick={() => act(action)}
      disabled={loading !== null}
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 'var(--pf-r-sm)',
        border: '1px solid var(--pf-border)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--pf-font-body)',
        transition: 'opacity 0.15s',
        opacity: loading !== null ? 0.5 : 1,
        ...style,
      }}
    >
      {loading === action
        ? <Loader2 size={12} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
        : <Icon size={12} strokeWidth={2.5} />
      }
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {btn('accept', 'Aceptar', Check, {
        background: 'var(--pf-success)', color: 'var(--pf-success-fg)',
        borderColor: 'var(--pf-success-fg)',
      })}

      {btn('reject', 'Rechazar', X, {
        background: '#fff', color: 'var(--pf-ink)',
      })}

      {type === 'care' && btn('block', 'Bloquear', Ban, {
        background: 'var(--pf-danger)', color: 'var(--pf-danger-fg)',
        borderColor: 'var(--pf-danger-fg)',
      })}

      {error && (
        <p style={{
          width: '100%', fontSize: 11, color: 'var(--pf-danger-fg)',
          margin: 0, paddingTop: 2,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
