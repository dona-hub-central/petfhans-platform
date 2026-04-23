'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center" style={{ borderColor: 'var(--pf-border)' }}>

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'var(--pf-coral-soft)' }}>
            <Mail size={32} strokeWidth={1.5} style={{ color: 'var(--pf-coral)' }} />
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--pf-ink)' }}>Revisa tu correo</h1>
          <p className="text-sm mb-1" style={{ color: 'var(--pf-muted)' }}>
            Enviamos un enlace de verificación a
          </p>
          {email && (
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--pf-ink)' }}>{email}</p>
          )}
          <p className="text-sm mb-6" style={{ color: 'var(--pf-muted)' }}>
            Haz clic en el enlace del email para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.
          </p>

          <div className="rounded-xl p-4 mb-6 text-left" style={{ background: 'var(--pf-bg)', border: '1px solid var(--pf-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--pf-ink)' }}>¿Qué pasa después?</p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--pf-muted)' }}>
              <li>Verifica tu email con el enlace</li>
              <li>Agrega tu mascota (opcional)</li>
              <li>Conecta con tu clínica veterinaria</li>
            </ol>
          </div>

          <Link href="/auth/login"
            className="text-sm font-medium" style={{ color: 'var(--pf-coral)' }}>
            ← Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>
}
