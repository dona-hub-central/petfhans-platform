'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function InviteForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [step, setStep] = useState<'loading' | 'register' | 'error'>('loading')
  const [invitation, setInvitation] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStep('error'); return }

    const validate = async () => {
      const res = await fetch(`/api/auth/validate-invite?token=${token}`)
      if (!res.ok) { setStep('error'); return }
      const { invitation } = await res.json()
      if (!invitation) { setStep('error'); return }
      setInvitation(invitation)
      setStep('register')
    }
    validate()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: form.full_name,
          password: form.password,
          email: invitation.email,
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error ?? 'Error al registrarse'); setLoading(false); return }

      // Login automático
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password: form.password })
      if (signInError) { setError('Cuenta creada pero no pudo iniciar sesión automáticamente. Ve a login.'); setLoading(false); return }

      const role = invitation.role
      window.location.href = ['vet_admin', 'veterinarian'].includes(role)
        ? '/vet/dashboard'
        : '/owner/dashboard'
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
  const inputStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }
  const focus = {
    onFocus: (e: any) => e.target.style.borderColor = 'var(--pf-coral)',
    onBlur:  (e: any) => e.target.style.borderColor = 'var(--pf-border)',
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pf-bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🐾</div>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Validando invitación...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
        <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="text-4xl mb-4">😕</div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--pf-ink)' }}>Invitación inválida</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--pf-muted)' }}>
            Este link ya fue usado, expiró o no es válido. Pide una nueva invitación a tu veterinaria.
          </p>
          <a href="/auth/login" className="btn-pf px-6 py-2.5 text-sm inline-block">Ir al login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--pf-border)' }}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--pf-coral-soft)' }}>
              <span className="text-2xl">🐾</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>
              {invitation.clinics?.name} te invita
            </h1>
            {invitation.pets && (
              <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
                Acceso al perfil de <strong>{invitation.pets.name}</strong>
              </p>
            )}
          </div>

          {/* Info */}
          <div className="rounded-xl p-3 mb-6 text-sm" style={{ background: 'var(--pf-coral-soft)' }}>
            <p style={{ color: 'var(--pf-coral)' }}>
              📧 Invitación para <strong>{invitation.email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Tu nombre</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                required className={inputCls} style={inputStyle} {...focus}
                placeholder="María García" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Contraseña</label>
              <input type="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required minLength={8} className={inputCls} style={inputStyle} {...focus}
                placeholder="mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Confirmar contraseña</label>
              <input type="password" value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                required className={inputCls} style={inputStyle} {...focus}
                placeholder="repite la contraseña" />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-pf w-full py-3 text-sm mt-2">
              {loading ? 'Creando cuenta...' : '✓ Crear mi cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return <Suspense><InviteForm /></Suspense>
}
