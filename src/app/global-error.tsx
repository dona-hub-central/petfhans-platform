'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[GlobalError]', error) }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F7F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#FFF0EF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30 }}>
            🐾
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
            Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
          </p>
          <button onClick={reset} style={{ background: '#EE726D', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginRight: 10 }}>
            Reintentar
          </button>
          <a href="/" style={{ color: '#EE726D', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Ir al inicio</a>
        </div>
      </body>
    </html>
  )
}
