'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, ChevronLeft } from 'lucide-react'

const ROLE_REDIRECTS: Record<string, string> = {
  superadmin:   '/admin',
  vet_admin:    '/vet/dashboard',
  veterinarian: '/vet/dashboard',
  pet_owner:    '/owner/perfil',
}

const ROLE_LABEL: Record<string, string> = {
  superadmin:   'Superadmin',
  vet_admin:    'Administrador de clínica',
  veterinarian: 'Veterinario',
  pet_owner:    'Dueño de mascota',
}

const LS_KEY = 'pf_accounts'

type SavedAccount = {
  email: string
  name:  string
  role:  string
}

function readAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is SavedAccount =>
        typeof a === 'object' && typeof a.email === 'string' && typeof a.name === 'string',
    )
  } catch {
    return []
  }
}

function saveAccount(account: SavedAccount) {
  const accounts = readAccounts().filter(a => a.email !== account.email)
  accounts.unshift(account)
  localStorage.setItem(LS_KEY, JSON.stringify(accounts.slice(0, 5)))
}

function removeAccount(email: string) {
  const accounts = readAccounts().filter(a => a.email !== email)
  localStorage.setItem(LS_KEY, JSON.stringify(accounts))
}

function initials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts[0]) return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

// Validates ?next= is a safe relative path (prevents open redirect)
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/auth')) return next
  return null
}

function LoginForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const next        = safeNext(searchParams.get('next'))
  const emailParam  = searchParams.get('email') ?? ''

  const verificationError = searchParams.get('error') === 'verification'
  const justVerified      = searchParams.get('verified') === 'true'

  // Account chooser state
  const [accounts, setAccounts]         = useState<SavedAccount[]>([])
  const [selected, setSelected]         = useState<SavedAccount | null>(null)
  const [showNewForm, setShowNewForm]   = useState(false)

  // Form fields
  const [email, setEmail]       = useState(emailParam)
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]       = useState('')

  const passwordRef = useRef<HTMLInputElement>(null)

  // Load saved accounts + check existing session
  useEffect(() => {
    const saved = readAccounts()
    setAccounts(saved)

    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('user_id', user.id).single()
        router.replace(next ?? ROLE_REDIRECTS[profile?.role ?? ''] ?? '/vet/dashboard')
      } else {
        setChecking(false)
        // If URL has email and no saved accounts, pre-fill form
        if (emailParam && saved.length === 0) setShowNewForm(true)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When a saved account is selected, focus password
  useEffect(() => {
    if (selected) {
      setPassword('')
      setError('')
      setTimeout(() => passwordRef.current?.focus(), 50)
    }
  }, [selected])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const loginEmail = selected ? selected.email : email.trim().toLowerCase()

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles').select('role, full_name').eq('user_id', data.user.id).single()

    // Persist account for next time
    saveAccount({
      email: loginEmail,
      name:  profile?.full_name ?? loginEmail,
      role:  profile?.role ?? '',
    })

    router.push(next ?? ROLE_REDIRECTS[profile?.role ?? ''] ?? '/vet/dashboard')
  }

  const handleRemove = (email: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeAccount(email)
    const updated = readAccounts()
    setAccounts(updated)
    if (selected?.email === email) setSelected(null)
  }

  const handleSelectAccount = (account: SavedAccount) => {
    setSelected(account)
    setShowNewForm(false)
  }

  const handleBack = () => {
    setSelected(null)
    setShowNewForm(false)
    setPassword('')
    setError('')
  }

  if (checking) {
    return (
      <div className="pf-login-page">
        <div style={{ textAlign: 'center' }}>
          <div className="pf-login-logo-wrap">
            <img src="/logo-icon.svg" width={36} height={36} alt="Petfhans" />
          </div>
          <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', marginTop: 12 }}>
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  // Decide which view to show
  const hasAccounts  = accounts.length > 0
  const showChooser  = hasAccounts && !selected && !showNewForm
  const showSelected = !!selected
  const showFull     = showNewForm || (!hasAccounts && !selected)

  return (
    <div className="pf-login-page">
      <div className="pf-login-card">

        {/* Logo */}
        <div className="pf-login-brand">
          <div className="pf-login-logo-wrap">
            <img src="/logo-icon.svg" width={36} height={36} alt="Petfhans" />
          </div>
          <h1 className="pf-login-title">Petfhans</h1>
          <p className="pf-login-sub">Plataforma veterinaria</p>
        </div>

        {/* Status banners */}
        {justVerified && (
          <div className="pf-login-banner pf-login-banner-success">
            Cuenta verificada. Ingresa tu contraseña para continuar.
          </div>
        )}
        {verificationError && (
          <div className="pf-login-banner pf-login-banner-warn">
            No se pudo verificar el enlace. Intenta iniciar sesión directamente.
          </div>
        )}

        {/* ── ACCOUNT CHOOSER ── */}
        {showChooser && (
          <>
            <p className="pf-login-chooser-label">Elige una cuenta</p>
            <div className="pf-login-accounts">
              {accounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  className="pf-login-account-row"
                  onClick={() => handleSelectAccount(acc)}
                >
                  <span className="pf-login-avatar">{initials(acc.name, acc.email)}</span>
                  <span className="pf-login-account-info">
                    <span className="pf-login-account-name">{acc.name || acc.email}</span>
                    <span className="pf-login-account-email">{acc.email}</span>
                    {acc.role && (
                      <span className="pf-login-account-role">{ROLE_LABEL[acc.role] ?? acc.role}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="pf-login-remove"
                    aria-label={`Olvidar cuenta ${acc.email}`}
                    onClick={e => handleRemove(acc.email, e)}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pf-login-add-account"
              onClick={() => { setShowNewForm(true); setEmail(''); setPassword('') }}
            >
              <Plus size={15} strokeWidth={2} />
              Agregar otra cuenta
            </button>
          </>
        )}

        {/* ── SELECTED ACCOUNT (password only) ── */}
        {showSelected && selected && (
          <>
            <button type="button" className="pf-login-back" onClick={handleBack}>
              <ChevronLeft size={15} strokeWidth={2} />
              Todas las cuentas
            </button>

            <div className="pf-login-selected-chip">
              <span className="pf-login-avatar pf-login-avatar-sm">
                {initials(selected.name, selected.email)}
              </span>
              <span className="pf-login-selected-email">{selected.email}</span>
            </div>

            <form onSubmit={handleLogin} className="pf-login-form">
              <div className="pf-login-field">
                <label className="pf-login-label">Contraseña</label>
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pf-login-input"
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="pf-login-error">{error}</div>}

              <button type="submit" disabled={loading} className="pf-login-submit">
                {loading ? 'Ingresando...' : 'Continuar'}
              </button>
            </form>
          </>
        )}

        {/* ── FULL FORM (email + password) ── */}
        {showFull && (
          <>
            {hasAccounts && (
              <button type="button" className="pf-login-back" onClick={handleBack}>
                <ChevronLeft size={15} strokeWidth={2} />
                Todas las cuentas
              </button>
            )}

            <form onSubmit={handleLogin} className="pf-login-form">
              <div className="pf-login-field">
                <label className="pf-login-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pf-login-input"
                  placeholder="tu@email.com"
                  autoFocus={!emailParam}
                />
              </div>

              <div className="pf-login-field">
                <label className="pf-login-label">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pf-login-input"
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="pf-login-error">{error}</div>}

              <button type="submit" disabled={loading} className="pf-login-submit">
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </>
        )}

        {/* Footer links */}
        <div className="pf-login-footer">
          <p>
            ¿No tienes cuenta?{' '}
            <a href="/auth/register">Crear cuenta</a>
          </p>
          <p>
            ¿Acceso por invitación?{' '}
            <a href="/auth/invite">Usar link de invitación</a>
          </p>
        </div>
      </div>

      <style>{`
        .pf-login-page {
          min-height: 100svh;
          display: flex; align-items: center; justify-content: center;
          padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
          background: var(--pf-bg);
        }
        .pf-login-card {
          width: 100%; max-width: 420px;
          background: var(--pf-white);
          border-radius: 20px;
          border: 0.5px solid var(--pf-border);
          box-shadow: var(--pf-shadow-sm);
          padding: 32px 28px;
        }
        .pf-login-brand { text-align: center; margin-bottom: 24px; }
        .pf-login-logo-wrap {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 56px; border-radius: 16px;
          background: var(--pf-coral-soft);
          margin-bottom: 12px;
        }
        .pf-login-title {
          font-family: var(--pf-font-display);
          font-size: 22px; font-weight: 700; color: var(--pf-ink);
          margin: 0; letter-spacing: -0.01em;
        }
        .pf-login-sub {
          font-family: var(--pf-font-body);
          font-size: 13px; color: var(--pf-muted);
          margin: 4px 0 0;
        }

        /* Banners */
        .pf-login-banner {
          font-family: var(--pf-font-body);
          font-size: 13px; border-radius: 10px;
          padding: 10px 14px; margin-bottom: 16px;
        }
        .pf-login-banner-success { background: var(--pf-success); color: var(--pf-success-fg); }
        .pf-login-banner-warn    { background: var(--pf-coral-soft); color: var(--pf-coral-dark); }

        /* Account chooser */
        .pf-login-chooser-label {
          font-family: var(--pf-font-body);
          font-size: 11px; font-weight: 700; color: var(--pf-muted);
          text-transform: uppercase; letter-spacing: .07em;
          margin: 0 0 10px;
        }
        .pf-login-accounts {
          display: flex; flex-direction: column; gap: 6px;
          margin-bottom: 12px;
        }
        .pf-login-account-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          background: var(--pf-surface);
          border: 0.5px solid var(--pf-border);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          font-family: var(--pf-font-body);
          transition: border-color .15s, box-shadow .15s;
          width: 100%;
        }
        .pf-login-account-row:hover {
          border-color: var(--pf-coral-mid);
          box-shadow: var(--pf-shadow-card-hover);
        }
        .pf-login-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--pf-coral-soft);
          color: var(--pf-coral);
          display: inline-flex; align-items: center; justify-content: center;
          font-family: var(--pf-font-display);
          font-size: 16px; font-weight: 700;
          flex-shrink: 0;
        }
        .pf-login-avatar-sm { width: 32px; height: 32px; font-size: 13px; }
        .pf-login-account-info {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 1px;
        }
        .pf-login-account-name {
          font-size: 14px; font-weight: 600; color: var(--pf-ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pf-login-account-email {
          font-size: 12px; color: var(--pf-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pf-login-account-role {
          font-size: 11px; color: var(--pf-coral);
          font-weight: 600; margin-top: 2px;
        }
        .pf-login-remove {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 6px;
          background: transparent; border: none;
          color: var(--pf-hint); cursor: pointer;
          flex-shrink: 0;
          transition: background .15s, color .15s;
        }
        .pf-login-remove:hover { background: var(--pf-border); color: var(--pf-muted); }

        .pf-login-add-account {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          width: 100%; padding: 10px;
          background: transparent; border: 0.5px dashed var(--pf-border-md);
          border-radius: 12px; cursor: pointer;
          font-family: var(--pf-font-body);
          font-size: 13px; font-weight: 600; color: var(--pf-muted);
          transition: border-color .15s, color .15s;
          margin-bottom: 4px;
        }
        .pf-login-add-account:hover { border-color: var(--pf-coral); color: var(--pf-coral); }

        /* Back button */
        .pf-login-back {
          display: inline-flex; align-items: center; gap: 4px;
          background: none; border: none; padding: 0;
          font-family: var(--pf-font-body);
          font-size: 13px; font-weight: 600; color: var(--pf-muted);
          cursor: pointer; margin-bottom: 16px;
          transition: color .15s;
        }
        .pf-login-back:hover { color: var(--pf-ink); }

        /* Selected account chip */
        .pf-login-selected-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          background: var(--pf-surface);
          border: 0.5px solid var(--pf-border);
          border-radius: 10px; margin-bottom: 16px;
        }
        .pf-login-selected-email {
          font-family: var(--pf-font-body);
          font-size: 14px; font-weight: 500; color: var(--pf-ink);
        }

        /* Form */
        .pf-login-form { display: flex; flex-direction: column; gap: 14px; }
        .pf-login-field { display: flex; flex-direction: column; gap: 6px; }
        .pf-login-label {
          font-family: var(--pf-font-body);
          font-size: 12.5px; font-weight: 500; color: var(--pf-ink);
        }
        .pf-login-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 0.5px solid var(--pf-border-md);
          font-family: var(--pf-font-body);
          font-size: 15px; color: var(--pf-ink);
          background: var(--pf-white);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .pf-login-input::placeholder { color: var(--pf-hint); }
        .pf-login-input:focus {
          border-color: var(--pf-coral);
          box-shadow: var(--pf-shadow-focus);
        }
        .pf-login-error {
          font-family: var(--pf-font-body);
          font-size: 13px;
          padding: 10px 14px; border-radius: 10px;
          background: var(--pf-coral-soft); color: var(--pf-coral-dark);
        }
        .pf-login-submit {
          width: 100%; padding: 12px;
          background: var(--pf-coral); color: #fff;
          border: none; border-radius: 10px;
          font-family: var(--pf-font-body);
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: background .15s, transform .1s;
        }
        .pf-login-submit:hover { background: var(--pf-coral-dark); }
        .pf-login-submit:active { transform: scale(.98); }
        .pf-login-submit:disabled { opacity: .55; cursor: not-allowed; }

        /* Footer */
        .pf-login-footer {
          margin-top: 20px;
          display: flex; flex-direction: column; gap: 6px;
          text-align: center;
        }
        .pf-login-footer p {
          margin: 0;
          font-family: var(--pf-font-body);
          font-size: 12px; color: var(--pf-muted);
        }
        .pf-login-footer a {
          color: var(--pf-coral); font-weight: 600; text-decoration: none;
        }
        .pf-login-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
