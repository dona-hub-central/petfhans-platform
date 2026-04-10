'use client'

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

  const statusStyle = {
    active:  { bg: '#edfaf1', color: '#1a7a3c', label: 'Activa' },
    used:    { bg: 'var(--bg)', color: 'var(--muted)', label: 'Aceptada' },
    expired: { bg: '#fff8e6', color: '#b07800', label: 'Expirada' },
  }[status]

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copiado al portapapeles')
    })
  }

  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
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

          {status === 'active' && (
            <div className="mt-2 flex items-center gap-2">
              <code className="text-xs px-2 py-1 rounded-lg truncate max-w-[260px] block"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {link}
              </code>
              <button
                onClick={handleCopy}
                className="text-xs px-2.5 py-1 rounded-lg border flex-shrink-0 transition"
                style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                Copiar
              </button>
            </div>
          )}

          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
            {status === 'used'
              ? `Aceptada el ${new Date(inv.used_at).toLocaleDateString('es-ES')}`
              : status === 'expired'
              ? `Expiró el ${new Date(inv.expires_at).toLocaleDateString('es-ES')}`
              : `Expira el ${new Date(inv.expires_at).toLocaleDateString('es-ES')}`}
          </p>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
          style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {statusStyle.label}
        </span>
      </div>
    </div>
  )
}
