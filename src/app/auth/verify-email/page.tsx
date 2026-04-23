'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, RotateCw } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError]       = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const submitCode = async (d: string[]) => {
    const code = d.join('')
    if (code.length !== 6) return
    setLoading(true); setError('')

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Código incorrecto')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setLoading(false)
      return
    }

    // Verified — redirect to login with pre-filled email
    const dest = json.email
      ? `/auth/login?email=${encodeURIComponent(json.email)}&verified=true`
      : '/auth/login?verified=true'
    router.push(dest)
  }

  const handleDigit = (idx: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = d
    setDigits(next)
    if (d && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (d && idx === 5) submitCode(next)
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      const next = text.split('')
      setDigits(next)
      inputRefs.current[5]?.focus()
      submitCode(next)
    }
  }

  const resend = async () => {
    setResending(true); setError('')
    const res = await fetch('/api/auth/resend-otp', { method: 'POST' })
    const json = await res.json()
    setResending(false)
    if (res.ok) {
      setCooldown(60)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      setError(json.error ?? 'Error al reenviar')
    }
  }

  const code = digits.join('')

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--pf-bg)', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center" style={{ borderColor: 'var(--pf-border)' }}>

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'var(--pf-coral-soft)' }}>
            <Mail size={32} strokeWidth={1.5} style={{ color: 'var(--pf-coral)' }} />
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--pf-ink)' }}>Revisa tu correo</h1>
          <p className="text-sm mb-1" style={{ color: 'var(--pf-muted)' }}>Enviamos un código de 6 dígitos a</p>
          {email && (
            <p className="text-sm font-semibold mb-6" style={{ color: 'var(--pf-ink)' }}>{email}</p>
          )}

          {/* 6 digit inputs */}
          <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                disabled={loading}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-14 text-center font-bold rounded-xl border-2 outline-none transition"
                style={{
                  borderColor: d ? 'var(--pf-coral)' : 'var(--pf-border)',
                  color: 'var(--pf-ink)',
                  fontSize: 22,
                  WebkitAppearance: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--pf-coral)' }}
                onBlur={e => { e.target.style.borderColor = d ? 'var(--pf-coral)' : 'var(--pf-border)' }}
              />
            ))}
          </div>

          <button
            onClick={() => submitCode(digits)}
            disabled={loading || code.length !== 6}
            className="btn-pf w-full py-3 text-sm mb-3"
            style={{ opacity: code.length !== 6 || loading ? 0.5 : 1 }}>
            {loading ? 'Verificando...' : 'Verificar cuenta'}
          </button>

          {error && (
            <p className="text-sm mb-3 px-1" style={{ color: 'var(--pf-coral)' }}>{error}</p>
          )}

          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>
            ¿No recibiste el código?{' '}
            {cooldown > 0 ? (
              <span>Reenviar en {cooldown}s</span>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="font-semibold inline-flex items-center gap-1"
                style={{ color: 'var(--pf-coral)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                <RotateCw size={13} strokeWidth={2.5} style={{ marginTop: 1 }} />
                {resending ? 'Enviando...' : 'Reenviar'}
              </button>
            )}
          </p>

          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--pf-border)' }}>
            <Link href="/auth/register" className="text-xs" style={{ color: 'var(--pf-muted)' }}>
              ← Volver al registro
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>
}
