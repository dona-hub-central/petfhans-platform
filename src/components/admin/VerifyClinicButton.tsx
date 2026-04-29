'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, ShieldOff } from 'lucide-react'

export default function VerifyClinicButton({
  clinicId,
  verified,
}: {
  clinicId: string
  verified: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    await fetch(`/api/admin/clinics/${clinicId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: !verified }),
    })
    router.refresh()
    setLoading(false)
  }

  return verified ? (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: 'var(--pf-success)', color: 'var(--pf-success-fg)',
        border: '1px solid #b2f0c9', cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <BadgeCheck size={14} strokeWidth={2} />
      {loading ? 'Actualizando...' : 'Verificada — revocar'}
    </button>
  ) : (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: 'var(--pf-coral)', color: '#fff',
        border: 'none', cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <ShieldOff size={14} strokeWidth={2} />
      {loading ? 'Actualizando...' : 'Verificar clínica'}
    </button>
  )
}
