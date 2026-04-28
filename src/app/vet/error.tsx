'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function VetError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[VetError]', error) }, [error])

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <AlertTriangle size={26} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 20, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Error al cargar
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
          No se pudo cargar esta sección. Intenta de nuevo o vuelve al dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn-pf" style={{ padding: '9px 20px', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Reintentar
          </button>
          <Link href="/vet/dashboard" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 20px', borderRadius: 10, border: '0.5px solid var(--pf-border)', background: '#fff', color: 'var(--pf-ink)', fontSize: 13, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
