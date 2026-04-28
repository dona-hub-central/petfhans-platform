import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pf-bg)', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontFamily: 'var(--pf-font-display)', fontSize: 64, fontWeight: 700, color: 'var(--pf-coral-mid)', lineHeight: 1, marginBottom: 16 }}>
          404
        </div>
        <h1 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Página no encontrada
        </h1>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
          La URL que buscas no existe o fue movida.
        </p>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, background: 'var(--pf-coral)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
