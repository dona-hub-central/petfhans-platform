'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InvitationData = {
  email: string
  role: string
  clinics?: { name: string } | null
  pets?: { name: string } | null
}

type Step = 'loading' | 'register' | 'link' | 'error'

function InviteForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [step, setStep]             = useState<Step>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [form, setForm]             = useState({ full_name: '', password: '', confirm: '' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!token) { setStep('error'); return }

    const supabase = createClient()

    const init = async () => {
      // Validate invitation token
      const res = await fetch(`/api/auth/validate-invite?token=${token}`)
      if (!res.ok) { setStep('error'); return }
      const { invitation: inv, userExists } = await res.json()
      if (!inv) { setStep('error'); return }
      setInvitation(inv)

      // Check current session
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentEmail(user?.email ?? null)

      setStep(userExists ? 'link' : 'register')
    }
    init()
  }, [token])

  // ── NEW USER: register + auto-link ────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, full_name: form.full_name, password: form.password }),
    })
    const result = await res.json()
    if (!res.ok) { setError(result.error ?? 'Error al registrarse'); setLoading(false); return }

    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: invitation!.email,
      password: form.password,
    })
    if (signInErr) {
      setError('Cuenta creada. Ve a iniciar sesión manualmente.')
      setLoading(false)
      return
    }
    redirect(invitation!.role)
  }

  // ── EXISTING USER: login + link ───────────────────────────────────────────
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const supabase = createClient()

    // Sign in to verify identity (if not already logged in with the right account)
    if (currentEmail?.toLowerCase() !== invitation!.email.toLowerCase()) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invitation!.email,
        password: form.password,
      })
      if (signInErr) {
        setError('Contraseña incorrecta')
        setLoading(false)
        return
      }
    }

    const res = await fetch('/api/auth/link-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const result = await res.json()
    if (!res.ok) { setError(result.error ?? 'Error al vincular'); setLoading(false); return }

    redirect(invitation!.role)
  }

  const redirect = (role: string) => {
    window.location.href = ['vet_admin', 'veterinarian'].includes(role)
      ? '/vet/dashboard'
      : '/owner/perfil'
  }

  const inputCls   = 'w-full px-4 py-3 rounded-lg border text-sm outline-none transition'
  const inputStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }
  const focus = {
    onFocus: (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-coral)' },
    onBlur:  (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-border)' },
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pf-bg)' }}>
        <div className="text-center">
          <div className="mb-3"><img src="/logo-icon.svg" width={48} height={48} alt="Petfhans" style={{ borderRadius: 12 }} /></div>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Validando invitación...</p>
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
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

  const clinicName = invitation!.clinics?.name ?? 'Tu veterinaria'
  const isAlreadyLoggedIn = !!currentEmail && currentEmail.toLowerCase() === invitation!.email.toLowerCase()
  const isWrongAccount    = !!currentEmail && currentEmail.toLowerCase() !== invitation!.email.toLowerCase()

  // ── REGISTER (new user) ───────────────────────────────────────────────────
  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                style={{ background: 'var(--pf-coral-soft)' }}>
                <img src="/logo-icon.svg" width={40} height={40} alt="Petfhans" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>
                {clinicName} te invita
              </h1>
              {invitation!.pets && (
                <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
                  Acceso al perfil de <strong>{invitation!.pets.name}</strong>
                </p>
              )}
            </div>

            <div className="rounded-xl p-3 mb-6 text-sm" style={{ background: 'var(--pf-coral-soft)' }}>
              <p style={{ color: 'var(--pf-coral)' }}>
                📧 Invitación para <strong>{invitation!.email}</strong>
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Tu nombre</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  required className={inputCls} style={inputStyle} {...focus} placeholder="María García" />
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

  // ── LINK (existing user) ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--pf-coral-soft)' }}>
              <img src="/logo-icon.svg" width={40} height={40} alt="Petfhans" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>
              {clinicName} te invita
            </h1>
            {invitation!.pets && (
              <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
                Acceso al perfil de <strong>{invitation!.pets.name}</strong>
              </p>
            )}
          </div>

          {/* Already logged in with the wrong account */}
          {isWrongAccount ? (
            <div>
              <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: '#fff8e6', border: '1px solid #fde68a' }}>
                <p style={{ color: '#b07800', fontWeight: 600, marginBottom: 4 }}>Sesión activa con otra cuenta</p>
                <p style={{ color: '#b07800' }}>
                  Estás conectado como <strong>{currentEmail}</strong>, pero esta invitación
                  es para <strong>{invitation!.email}</strong>. Cierra sesión y vuelve a abrir el link.
                </p>
              </div>
              <a href="/auth/login" className="btn-pf w-full py-3 text-sm block text-center">
                Cerrar sesión e ir al login
              </a>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--pf-coral-soft)' }}>
                <p style={{ color: 'var(--pf-coral)' }}>
                  📧 Ya tienes cuenta con <strong>{invitation!.email}</strong>
                </p>
              </div>

              {/* If already logged in with correct account, no password needed */}
              {!isAlreadyLoggedIn && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
                    Tu contraseña de Petfhans
                  </label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required className={inputCls} style={inputStyle} {...focus}
                    placeholder="Tu contraseña actual" />
                </div>
              )}

              {isAlreadyLoggedIn && (
                <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>
                  Sesión activa. Un clic y listo.
                </p>
              )}

              {error && (
                <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-pf w-full py-3 text-sm">
                {loading ? 'Vinculando...' : `Vincular a ${clinicName}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return <Suspense><InviteForm /></Suspense>
}
