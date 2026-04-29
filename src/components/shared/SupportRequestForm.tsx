'use client'

import { useState } from 'react'
import { ShieldCheck, Building2, MessageCircle, ChevronLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type Type = 'clinic_creation' | 'general'

export default function SupportRequestForm({
  defaultEmail,
  defaultName,
  backHref,
  backLabel = 'Volver',
}: {
  defaultEmail: string
  defaultName?: string
  backHref: string
  backLabel?: string
}) {
  const [type, setType]               = useState<Type>('clinic_creation')
  const [clinicName, setClinicName]   = useState('')
  const [subject, setSubject]         = useState('')
  const [message, setMessage]         = useState('')
  const [phone, setPhone]             = useState('')
  const [contactEmail, setContactEmail] = useState(defaultEmail)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [submitted, setSubmitted]     = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/support/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        subject: subject.trim(),
        message: message.trim(),
        clinic_name: type === 'clinic_creation' ? clinicName.trim() : null,
        contact_phone: phone.trim() || null,
        contact_email: contactEmail.trim().toLowerCase(),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'No se pudo enviar la solicitud'); setLoading(false); return }
    setSubmitted(true); setLoading(false)
  }

  const inp = 'w-full px-4 py-3 rounded-xl border outline-none transition'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', fontSize: 16 as const }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: '#edfaf1' }}>
            <CheckCircle2 size={28} strokeWidth={1.5} style={{ color: '#1a7a3c' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--pf-ink)' }}>Solicitud enviada</h2>
          <p className="text-sm mb-1" style={{ color: 'var(--pf-muted)' }}>
            {type === 'clinic_creation'
              ? 'Nuestro equipo verificará la información de tu clínica y veterinario.'
              : 'Te responderemos lo antes posible.'}
          </p>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>
            Recibirás respuesta en <strong>{contactEmail}</strong> en las próximas 48 horas.
          </p>
          <Link href={backHref}
            className="inline-flex items-center gap-1 text-sm mt-6"
            style={{ color: 'var(--pf-coral)', textDecoration: 'none', fontWeight: 600 }}>
            <ChevronLeft size={14} strokeWidth={2} /> {backLabel}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>
      <Link href={backHref}
        className="inline-flex items-center gap-1 text-sm mb-4"
        style={{ color: 'var(--pf-muted)', textDecoration: 'none' }}>
        <ChevronLeft size={14} strokeWidth={2} /> {backLabel}
      </Link>

      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--pf-ink)' }}>Contactar soporte</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--pf-muted)' }}>
        Si quieres usar Petfhans como veterinario, abre tu clínica desde aquí.
      </p>

      <div className="rounded-xl p-3 mb-5 flex gap-2" style={{ background: '#fff8e6', border: '1px solid #f0d97a' }}>
        <ShieldCheck size={18} strokeWidth={2} style={{ color: '#b07800', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs leading-relaxed" style={{ color: '#7a5400' }}>
          Para proteger a los dueños y mascotas, verificamos manualmente cada clínica
          y veterinario antes de habilitar el acceso. Te contactaremos para validar
          tu documentación profesional.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--pf-ink)' }}>Tipo de solicitud</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TypeOption
              active={type === 'clinic_creation'} onClick={() => setType('clinic_creation')}
              Icon={Building2} label="Crear clínica + ser admin" />
            <TypeOption
              active={type === 'general'} onClick={() => setType('general')}
              Icon={MessageCircle} label="Otra consulta" />
          </div>
        </div>

        {type === 'clinic_creation' && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
              Nombre de la clínica <span style={{ color: 'var(--pf-coral)' }}>*</span>
            </label>
            <input value={clinicName} onChange={e => setClinicName(e.target.value)} required
              className={inp} style={inpStyle} placeholder="Clínica Veterinaria Sol"
              onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
            Asunto <span style={{ color: 'var(--pf-coral)' }}>*</span>
          </label>
          <input value={subject} onChange={e => setSubject(e.target.value)} required minLength={4}
            className={inp} style={inpStyle}
            placeholder={type === 'clinic_creation' ? 'Quiero verificar mi clínica' : 'No puedo acceder a...'}
            onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
            onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
            Mensaje <span style={{ color: 'var(--pf-coral)' }}>*</span>
          </label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={10} rows={5}
            className={inp} style={inpStyle}
            placeholder={type === 'clinic_creation'
              ? 'Cuéntanos sobre tu clínica: dirección, número de colegiado, especialidades, etc.'
              : 'Describe tu consulta'}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--pf-coral)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--pf-border)'} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Email de contacto</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required
              className={inp} style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Teléfono (opcional)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className={inp} style={inpStyle} placeholder="+34 600 000 000"
              onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
          </div>
        </div>

        {defaultName && (
          <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>
            Solicitado por: <strong>{defaultName}</strong>
          </p>
        )}

        {error && (
          <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-pf w-full py-3 text-sm">
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  )
}

function TypeOption({
  active, onClick, Icon, label,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition"
      style={{
        borderColor: active ? 'var(--pf-coral)' : 'var(--pf-border)',
        background:  active ? 'var(--pf-coral-soft)' : 'transparent',
        color:       active ? 'var(--pf-coral-dark)' : 'var(--pf-ink)',
      }}>
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
