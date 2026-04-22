'use client'

import { useState } from 'react'
import { Video, MapPin, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

type Urgency = 'normal' | 'urgente' | 'emergencia'

const URGENCY_CFG: Record<Urgency, { label: string; color: string; bg: string; Icon: any; emailPrefix: string }> = {
  normal:      { label: 'Normal',      color: '#16a34a', bg: '#edfaf1', Icon: CheckCircle,   emailPrefix: '' },
  urgente:     { label: 'Urgente',     color: '#b07800', bg: '#fff8e6', Icon: AlertTriangle,  emailPrefix: '⚠️ [URGENTE] ' },
  emergencia:  { label: 'Emergencia',  color: '#dc2626', bg: '#fee2e2', Icon: AlertCircle,    emailPrefix: '🚨 [EMERGENCIA] ' },
}

export default function BookAppointment({ petId, clinicId }: { petId: string; clinicId: string }) {
  const [open, setOpen] = useState(false)
  const [isVirtual, setIsVirtual] = useState(false)
  const [urgency, setUrgency] = useState<Urgency>('normal')
  const [symptoms, setSymptoms] = useState('')
  const [medication, setMedication] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  const loadSlots = async (d: string) => {
    setDate(d); setTime(''); setSlots([])
    if (!d) return
    setLoadingSlots(true)
    const res = await fetch(`/api/appointments/slots?clinic_id=${clinicId}&date=${d}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setLoadingSlots(false)
  }

  const reset = () => {
    setOpen(false); setDate(''); setTime(''); setSymptoms('')
    setMedication(''); setUrgency('normal'); setIsVirtual(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time || !symptoms.trim()) { setError('Completa todos los campos obligatorios'); return }
    setLoading(true); setError('')

    const cfg = URGENCY_CFG[urgency]
    const composedReason = [
      cfg.emailPrefix + symptoms.trim(),
      medication.trim() ? `Medicación actual: ${medication.trim()}` : '',
    ].filter(Boolean).join(' | ')

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: petId,
        appointment_date: date,
        appointment_time: time + ':00',
        reason: composedReason,
        urgency,
        is_virtual: isVirtual,
      }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al solicitar cita'); setLoading(false); return }
    setOk(true); setLoading(false)
    setTimeout(() => { setOk(false); reset() }, 3500)
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const btnStyle = (active: boolean, color = '#EE726D') => ({
    flex: 1, border: 'none', borderRadius: 12, padding: '10px 4px', fontSize: 12,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? color + '18' : '#f2f2f7',
    color: active ? color : '#8e8e93',
    outline: active ? `2px solid ${color}` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  } as React.CSSProperties)

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: '100%', border: 'none', borderRadius: 18, padding: '14px 16px',
      background: '#EE726D', color: '#fff', fontFamily: 'inherit',
      fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      Solicitar cita
    </button>
  )

  if (ok) return (
    <div style={{ background: '#edfaf1', borderRadius: 18, padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
      <p style={{ fontSize: 32, margin: '0 0 8px' }}>✅</p>
      <p style={{ fontWeight: 700, fontSize: 15, color: '#1a7a3c', margin: 0 }}>¡Cita solicitada!</p>
      <p style={{ fontSize: 13, color: '#166534', margin: '4px 0 0' }}>
        {isVirtual
          ? 'Recibirás el enlace de videollamada cuando la clínica confirme'
          : 'Te notificaremos cuando la clínica confirme tu solicitud'}
      </p>
    </div>
  )

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1c1e', margin: 0 }}>Solicitar cita</p>
        <button type="button" onClick={reset}
          style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#8e8e93' }}>×</button>
      </div>

      {/* ── PASO 1: Tipo de cita ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Modalidad
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setIsVirtual(false)} style={btnStyle(!isVirtual)}>
            <MapPin size={13} /> Presencial
          </button>
          <button type="button" onClick={() => setIsVirtual(true)} style={btnStyle(isVirtual, '#6366f1')}>
            <Video size={13} /> Videollamada
          </button>
        </div>
      </div>

      {/* ── PASO 2: Urgencia ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Nivel de urgencia
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.entries(URGENCY_CFG) as [Urgency, typeof URGENCY_CFG[Urgency]][]).map(([key, cfg]) => (
            <button key={key} type="button" onClick={() => setUrgency(key)}
              style={btnStyle(urgency === key, cfg.color)}>
              <cfg.Icon size={12} /> {cfg.label}
            </button>
          ))}
        </div>
        {urgency === 'emergencia' && (
          <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0', fontWeight: 600 }}>
            Si es una emergencia grave, acude directamente a la clínica o llama por teléfono.
          </p>
        )}
      </div>

      {/* ── PASO 3: Síntomas (obligatorio) ── */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Síntomas o motivo principal *
        </label>
        <textarea
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
          rows={3}
          required
          placeholder="Describe los síntomas o el motivo de la consulta con el mayor detalle posible…"
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* ── PASO 4: Medicación actual (opcional) ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Medicación actual <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
        </label>
        <input
          type="text"
          value={medication}
          onChange={e => setMedication(e.target.value)}
          placeholder="Ej: Amoxicilina 250mg, ninguna…"
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* ── PASO 5: Fecha ── */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Fecha
        </label>
        <input type="date" value={date} min={minDateStr} onChange={e => loadSlots(e.target.value)}
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* ── PASO 6: Horario ── */}
      {date && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8e8e93', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Hora disponible
          </label>
          {loadingSlots ? (
            <p style={{ fontSize: 13, color: '#8e8e93' }}>Cargando horarios…</p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: 13, color: '#dc2626' }}>No hay horarios disponibles para este día</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map(s => (
                <button key={s} type="button" onClick={() => setTime(s)}
                  style={{
                    border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: time === s ? '#EE726D' : '#f2f2f7',
                    color: time === s ? '#fff' : '#1c1c1e',
                  }}>{s}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={reset}
          style={{ flex: 1, border: 'none', borderRadius: 12, padding: 13, background: '#f2f2f7', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !date || !time || !symptoms.trim()}
          style={{ flex: 2, border: 'none', borderRadius: 12, padding: 13, background: '#EE726D', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (loading || !date || !time || !symptoms.trim()) ? .6 : 1 }}>
          {loading ? 'Enviando…' : 'Solicitar cita'}
        </button>
      </div>
    </form>
  )
}
