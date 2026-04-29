'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, ShieldOff } from 'lucide-react'

export default function VerifyClinicButton({
  clinicId,
  verified: initialVerified,
}: {
  clinicId: string
  verified: boolean
}) {
  const router = useRouter()
  const [verified, setVerified] = useState(initialVerified)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const toggle = async () => {
    setLoading(true); setError('')
    const next = !verified
    const res = await fetch(`/api/admin/clinics/${clinicId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: next }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al actualizar')
      setLoading(false)
      return
    }
    setVerified(next)
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {verified ? (
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--pf-success)', color: 'var(--pf-success-fg)',
            border: '1px solid #b2f0c9', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <BadgeCheck size={14} strokeWidth={2} />
          {loading ? 'Actualizando...' : 'Verificada · revocar'}
        </button>
      ) : (
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--pf-coral)', color: '#fff',
            border: 'none', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <ShieldOff size={14} strokeWidth={2} />
          {loading ? 'Actualizando...' : 'Verificar clínica'}
        </button>
      )}
      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
      )}
    </div>
  )
}
