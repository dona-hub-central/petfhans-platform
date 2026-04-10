'use client'

import { useState } from 'react'

const roleLabel: Record<string, string> = {
  veterinarian: '👨‍⚕️ Veterinario',
  pet_owner:    '👤 Dueño de mascota',
  vet_admin:    '⚙️ Admin',
}

export function InvitationCard({
  inv,
  appUrl,
  status,
}: {
  inv: any
  appUrl: string
  status: 'active' | 'used' | 'expired'
}) {
  const link = `${appUrl}/auth/invite?token=${inv.token}`
  const [copied, setCopied]     = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent]     = useState(false)

  const statusStyle = {
    active:  { bg: '#edfaf1', color: '#1a7a3c', label: 'Activa' },
    used:    { bg: 'var(--bg)', color: 'var(--muted)', label: '✓ Aceptada' },
    expired: { bg: '#fff8e6', color: '#b07800', label: 'Expirada' },
  }[status]

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const res = await fetch('/api/vet/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: inv.id }),
      })
      if (res.ok) {
        setResent(true)
        setTimeout(() => setResent(false), 3000)
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.email}</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
              {roleLabel[inv.role] ?? inv.role}
            </span>
            {inv.pets && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>· 🐾 {inv.pets.name}</span>
            )}
          </div>

          {/* Link + acciones (solo activas) */}
          {status === 'active' && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <code className="text-xs px-2 py-1.5 rounded-lg truncate max-w-[240px]"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {link}
              </code>
              <button onClick={handleCopy}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition font-medium flex-shrink-0"
                style={{
                  borderColor: copied ? '#1a7a3c' : 'var(--border)',
                  color: copied ? '#1a7a3c' : 'var(--accent)',
                  background: copied ? '#edfaf1' : '#fff',
                }}>
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
              <button onClick={handleResend} disabled={resending}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition font-medium flex-shrink-0"
                style={{
                  borderColor: resent ? '#1a7a3c' : 'var(--border)',
                  color: resent ? '#1a7a3c' : 'var(--muted)',
                  background: resent ? '#edfaf1' : '#fff',
                }}>
                {resending ? 'Reenviando...' : resent ? '✓ Reenviado' : '↩ Reenviar'}
              </button>
            </div>
          )}

          {/* Fecha */}
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {status === 'used'
              ? `Aceptada el ${new Date(inv.used_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
              : status === 'expired'
              ? `Expiró el ${new Date(inv.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
              : `Expira el ${new Date(inv.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
        </div>

        {/* Badge estado */}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
          style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {statusStyle.label}
        </span>
      </div>
    </div>
  )
}
