'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function InviteForm() {
  const router = useRouter()
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
      const supabase = createClient()
      const { data: inv } = await supabase
        .from('invitations')
        .select('*, clinics(name, slug), pets(name)')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!inv) { setStep('error'); return }
      setInvitation(inv)
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
      await supabase.auth.signInWithPassword({ email: invitation.email, password: form.password })

      const role = invitation.role
      const slug = invitation.clinics?.slug
      const dest = ['vet_admin', 'veterinarian'].includes(role)
        ? `https://${slug}.petfhans.com/vet/dashboard`
        : `https://${slug}.petfhans.com/owner/dashboard`

      window.location.href = dest
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text)' }
  const focus = {
    onFocus: (e: any) => e.target.style.borderColor = 'var(--accent)',
    onBlur:  (e: any) => e.target.style.borderColor = 'var(--border)',
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🐾</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Validando invitación...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-4">😕</div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>Invitación inválida</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Este link ya fue usado, expiró o no es válido. Pide una nueva invitación a tu veterinaria.
          </p>
          <a href="/auth/login" className="btn-pf px-6 py-2.5 text-sm inline-block">Ir al login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--border)' }}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--accent-s)' }}>
              <span className="text-2xl">🐾</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {invitation.clinics?.name} te invita
            </h1>
            {invitation.pets && (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Acceso al perfil de <strong>{invitation.pets.name}</strong>
              </p>
            )}
          </div>

          {/* Info */}
          <div className="rounded-xl p-3 mb-6 text-sm" style={{ background: 'var(--accent-s)' }}>
            <p style={{ color: 'var(--accent)' }}>
              📧 Invitación para <strong>{invitation.email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Tu nombre</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                required className={inputCls} style={inputStyle} {...focus}
                placeholder="María García" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Contraseña</label>
              <input type="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required minLength={8} className={inputCls} style={inputStyle} {...focus}
                placeholder="mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Confirmar contraseña</label>
              <input type="password" value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                required className={inputCls} style={inputStyle} {...focus}
                placeholder="repite la contraseña" />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--accent-s)', color: 'var(--accent-h)' }}>
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
