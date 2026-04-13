import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Acceso no autorizado</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          No tienes permiso para ver esta página.
        </p>
        <Link href="/auth/login"
          className="btn-pf px-6 py-3 text-sm inline-block">
          Ir al login
        </Link>
      </div>
    </div>
  )
}
