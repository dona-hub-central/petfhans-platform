'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8)       { setError('La contraseña debe tener mínimo 8 caracteres'); return }
    setLoading(true); setError('')

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { role: 'pet_owner', full_name: form.full_name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/owner/setup`,
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?'
          : signUpError.message
      )
      setLoading(false)
      return
    }

    router.push(`/auth/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`)
  }

  const inp = 'w-full px-4 py-3 rounded-lg border transition outline-none'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', fontSize: 16 as const }
  const focus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = 'var(--pf-coral)',
    onBlur:  (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = 'var(--pf-border)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--pf-coral-soft)' }}>
              <img src="/logo-icon.svg" width={40} height={40} alt="Petfhans" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Crear cuenta</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Registra tu cuenta de dueño</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Nombre completo</label>
              <input value={form.full_name} onChange={set('full_name')} required
                autoComplete="name" className={inp} style={inpStyle} {...focus} placeholder="María García" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} required
                autoComplete="email" className={inp} style={inpStyle} {...focus} placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Contraseña</label>
              <input type="password" value={form.password} onChange={set('password')} required minLength={8}
                autoComplete="new-password" className={inp} style={inpStyle} {...focus} placeholder="mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Confirmar contraseña</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required
                autoComplete="new-password" className={inp} style={inpStyle} {...focus} placeholder="repite la contraseña" />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
                {error.includes('iniciar sesión') && (
                  <Link href="/auth/login" className="block mt-1 font-semibold underline" style={{ color: 'var(--pf-coral)' }}>
                    Ir al login →
                  </Link>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-pf w-full py-3 text-sm mt-2">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--pf-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="font-medium" style={{ color: 'var(--pf-coral)' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
