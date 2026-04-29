'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function OwnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[OwnerError]', error) }, [error])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <AlertTriangle size={28} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 20, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Algo salió mal
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          No pudimos cargar esta página. Intenta de nuevo.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ background: 'var(--pf-coral)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pf-font-body)' }}>
            Reintentar
          </button>
          <Link href="/owner/dashboard" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 22px', borderRadius: 12, border: '0.5px solid var(--pf-border)', background: '#fff', color: 'var(--pf-ink)', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
