'use client'

import { useState } from 'react'
import { X, Send, Building2 } from 'lucide-react'

interface Props {
  clinicId: string
  clinicName: string
}

export default function ClinicJoinRequestForm({ clinicId, clinicName }: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/clinic-join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id: clinicId, message: message.trim() || null }),
    })

    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Error al enviar la solicitud')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  const inp = {
    width: '100%', borderRadius: 10, border: '1px solid var(--pf-border)',
    padding: '9px 12px', fontSize: 14, color: 'var(--pf-ink)',
    fontFamily: 'var(--pf-font-body)', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pf"
        style={{ padding: '10px 20px', fontSize: 14 }}
      >
        Quiero trabajar aquí
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 520, padding: '24px 20px 32px',
              maxHeight: '80svh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, fontFamily: 'var(--pf-font-display)' }}>
                  Solicitar unirse
                </h2>
                <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '2px 0 0' }}>{clinicName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--pf-muted)' }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Building2 size={40} style={{ color: 'var(--pf-coral)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
                  Solicitud enviada
                </p>
                <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>
                  El administrador de la clínica revisará tu solicitud.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="btn-pf"
                  style={{ marginTop: 20, padding: '10px 24px' }}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pf-muted)', marginBottom: 6 }}>
                    Mensaje de presentación <span style={{ fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    placeholder="Preséntate brevemente o explica por qué quieres unirte..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    style={{ ...inp, resize: 'vertical' }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pf"
                  style={{ padding: '11px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} />
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
