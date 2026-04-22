'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLE_REDIRECTS: Record<string, string> = {
  superadmin:   '/admin',
  vet_admin:    '/vet/dashboard',
  veterinarian: '/vet/dashboard',
  pet_owner:    '/owner/dashboard',
}

// Validates ?next= is a safe relative path (prevents open redirect)
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/auth')) return next
  return null
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]       = useState('')

  // Already authenticated → redirect immediately
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('user_id', user.id).single()
        router.replace(next ?? ROLE_REDIRECTS[profile?.role ?? ''] ?? '/vet/dashboard')
      } else {
        setChecking(false)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('user_id', data.user.id).single()

    router.push(next ?? ROLE_REDIRECTS[profile?.role ?? ''] ?? '/vet/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pf-bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--pf-coral-soft)' }}>
              <img src="/logo-icon.svg" width={40} height={40} alt="Petfhans" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Petfhans</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Plataforma veterinaria</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border text-sm transition outline-none"
                style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                onBlur={e => e.target.style.borderColor = 'var(--pf-border)'}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg border text-sm transition outline-none"
                style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                onBlur={e => e.target.style.borderColor = 'var(--pf-border)'}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-pf w-full py-3 text-sm mt-2">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--pf-muted)' }}>
            ¿Acceso por invitación?{' '}
            <a href="/auth/invite" className="font-medium" style={{ color: 'var(--pf-coral)' }}>
              Usar link de invitación
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
