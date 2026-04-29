'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[AdminError]', error) }, [error])

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <AlertTriangle size={24} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 20, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Error al cargar
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Esta sección no pudo cargarse. Verifica los logs del servidor si el problema persiste.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn-pf" style={{ padding: '8px 18px', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Reintentar
          </button>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 18px', borderRadius: 10, border: '0.5px solid var(--pf-border)', background: '#fff', color: 'var(--pf-ink)', fontSize: 13, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
            Dashboard admin
          </Link>
        </div>
      </div>
    </div>
  )
}
