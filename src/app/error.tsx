'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[AppError]', error) }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pf-bg)', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 24, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Algo salió mal
        </h1>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ background: 'var(--pf-coral)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pf-font-body)' }}>
            Reintentar
          </button>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 22px', borderRadius: 10, border: '0.5px solid var(--pf-border)', background: '#fff', color: 'var(--pf-ink)', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
