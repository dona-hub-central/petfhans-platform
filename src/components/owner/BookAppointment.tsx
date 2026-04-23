'use client'

import { useState } from 'react'
import { Video, MapPin } from 'lucide-react'

export default function BookAppointment({
  petId,
  petName,
  clinicId,
}: {
  petId: string
  petName: string
  clinicId: string
}) {
  const [open, setOpen]           = useState(false)
  const [isVirtual, setIsVirtual] = useState(false)
  const [isUrgent, setIsUrgent]   = useState(false)
  const [reason, setReason]       = useState('')
  const [meds, setMeds]           = useState('')
  const [date, setDate]           = useState('')
  const [slots, setSlots]         = useState<string[]>([])
  const [time, setTime]           = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [ok, setOk]               = useState(false)
  const [error, setError]         = useState('')

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
    setOpen(false); setReason(''); setMeds(''); setDate('')
    setTime(''); setIsVirtual(false); setIsUrgent(false); setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('Cuéntanos el motivo de la consulta'); return }
    if (!date || !time) { setError('Elige una fecha y hora'); return }
    setLoading(true); setError('')

    const composedReason = [
      isUrgent ? '⚠️ [URGENTE] ' : '',
      reason.trim(),
      meds.trim() ? ` | Medicación: ${meds.trim()}` : '',
    ].join('')

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: petId,
        appointment_date: date,
        appointment_time: time + ':00',
        reason: composedReason,
        urgency: isUrgent ? 'urgente' : 'normal',
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

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: '100%', border: 'none', borderRadius: 18, padding: '14px 16px',
      background: '#EE726D', color: '#fff', fontFamily: 'inherit',
      fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12,
    }}>
      Solicitar cita
    </button>
  )

  if (ok) return (
    <div style={{ background: '#edfaf1', borderRadius: 18, padding: '24px 16px', textAlign: 'center', marginBottom: 12 }}>
      <p style={{ fontSize: 36, margin: '0 0 8px' }}>✅</p>
      <p style={{ fontWeight: 700, fontSize: 15, color: '#1a7a3c', margin: 0 }}>¡Solicitud enviada!</p>
      <p style={{ fontSize: 13, color: '#166534', margin: '6px 0 0' }}>
        Te avisaremos cuando la clínica confirme la cita.
      </p>
    </div>
  )

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid #f0f0f5' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1c1e', margin: 0 }}>
          Nueva cita para {petName}
        </p>
        <button type="button" onClick={reset}
          style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#8e8e93', lineHeight: 1 }}>×</button>
      </div>

      {/* Modalidad */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setIsVirtual(false)}
          style={pill(!isVirtual, '#EE726D')}>
          <MapPin size={13} /> En clínica
        </button>
        <button type="button" onClick={() => setIsVirtual(true)}
          style={pill(isVirtual, '#6366f1')}>
          <Video size={13} /> Videollamada
        </button>
      </div>

      {/* Motivo */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>¿Qué le pasa? *</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          required
          placeholder={`Describe brevemente los síntomas o el motivo de la consulta de ${petName}…`}
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 14, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Medicación */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>¿Toma algún medicamento? <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input
          type="text"
          value={meds}
          onChange={e => setMeds(e.target.value)}
          placeholder="Ej: Amoxicilina 250mg, ninguno…"
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 14, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Urgencia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 14, background: isUrgent ? '#fff8e6' : '#f2f2f7' }}>
        <button type="button" onClick={() => setIsUrgent(u => !u)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
            background: isUrgent ? '#f59e0b' : '#d1d5db', transition: 'background .2s',
          }}>
          <span style={{
            position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'transform .2s', transform: isUrgent ? 'translateX(20px)' : 'translateX(2px)',
          }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: isUrgent ? '#b07800' : '#6b7280' }}>
          {isUrgent ? '⚠️ Es urgente' : 'Consulta normal'}
        </span>
      </div>

      {/* Fecha */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>¿Cuándo?</label>
        <input type="date" value={date} min={minDateStr} onChange={e => loadSlots(e.target.value)}
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 14, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* Horarios */}
      {date && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Hora disponible</label>
          {loadingSlots ? (
            <p style={{ fontSize: 13, color: '#8e8e93', margin: 0 }}>Cargando horarios…</p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>Sin horarios disponibles para este día. Prueba con otro.</p>
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

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px', fontWeight: 500 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={reset}
          style={{ flex: 1, border: 'none', borderRadius: 14, padding: 14, background: '#f2f2f7', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !date || !time || !reason.trim()}
          style={{
            flex: 2, border: 'none', borderRadius: 14, padding: 14, background: '#EE726D', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            opacity: (loading || !date || !time || !reason.trim()) ? .55 : 1,
          }}>
          {loading ? 'Enviando…' : 'Solicitar cita'}
        </button>
      </div>
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280',
  marginBottom: 7, letterSpacing: '.02em',
}

function pill(active: boolean, color: string): React.CSSProperties {
  return {
    flex: 1, border: 'none', borderRadius: 12, padding: '10px 8px', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? color + '18' : '#f2f2f7',
    color: active ? color : '#8e8e93',
    outline: active ? `2px solid ${color}` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  }
}
