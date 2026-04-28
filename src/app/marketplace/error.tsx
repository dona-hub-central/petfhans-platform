'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function MarketplaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[MarketplaceError]', error) }, [error])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <AlertTriangle size={26} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 20, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          No pudimos cargar
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Ocurrió un error al cargar el Marketplace. Intenta de nuevo.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ background: 'var(--pf-coral)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pf-font-body)' }}>
            Reintentar
          </button>
          <Link href="/owner/dashboard" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 20px', borderRadius: 10, border: '0.5px solid var(--pf-border)', background: '#fff', color: 'var(--pf-ink)', fontSize: 14, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
