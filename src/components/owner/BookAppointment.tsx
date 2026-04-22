'use client'

import { useState } from 'react'
import { Video, MapPin } from 'lucide-react'

export default function BookAppointment({ petId, clinicId }: { petId: string; clinicId: string }) {
  const [open, setOpen] = useState(false)
  const [isVirtual, setIsVirtual] = useState(false)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time || !reason) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_id: petId, appointment_date: date, appointment_time: time + ':00', reason, is_virtual: isVirtual }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al solicitar cita'); setLoading(false); return }
    setOk(true); setLoading(false)
    setTimeout(() => { setOk(false); setOpen(false); setDate(''); setTime(''); setReason(''); setIsVirtual(false) }, 3500)
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const S = {
    btn: (active: boolean) => ({
      flex: 1, border: 'none', borderRadius: 12, padding: '10px 4px', fontSize: 13,
      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      background: active ? '#fff0ef' : '#f2f2f7',
      color: active ? '#EE726D' : '#8e8e93',
      outline: active ? '2px solid #EE726D' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    } as React.CSSProperties),
  }

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
          : 'Te notificaremos cuando la clínica la confirme'}
      </p>
    </div>
  )

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1c1e', margin: 0 }}>Solicitar cita</p>
        <button type="button" onClick={() => setOpen(false)}
          style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#8e8e93' }}>×</button>
      </div>

      {/* Tipo de cita */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6 }}>
          Tipo de cita
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setIsVirtual(false)} style={S.btn(!isVirtual)}>
            <MapPin size={13} /> Presencial
          </button>
          <button type="button" onClick={() => setIsVirtual(true)} style={S.btn(isVirtual)}>
            <Video size={13} /> Videollamada
          </button>
        </div>
        {isVirtual && (
          <p style={{ fontSize: 12, color: '#8e8e93', margin: '8px 0 0', lineHeight: 1.5 }}>
            La consulta se realizará por videollamada con Jitsi Meet. Recibirás el enlace cuando la clínica confirme la cita.
          </p>
        )}
      </div>

      {/* Fecha */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6 }}>
          Selecciona un día
        </label>
        <input type="date" value={date} min={minDateStr} onChange={e => loadSlots(e.target.value)}
          style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* Slots */}
      {date && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6 }}>
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

      {/* Motivo */}
      {time && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 6 }}>
            Motivo de la consulta
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="Describe el motivo de la cita…"
            style={{ width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)}
          style={{ flex: 1, border: 'none', borderRadius: 12, padding: 13, background: '#f2f2f7', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading || !date || !time || !reason}
          style={{ flex: 2, border: 'none', borderRadius: 12, padding: 13, background: '#EE726D', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (loading || !date || !time || !reason) ? .6 : 1 }}>
          {loading ? 'Enviando…' : 'Solicitar cita'}
        </button>
      </div>
    </form>
  )
}
