'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DURATIONS = [15,20,30,45,60]

type Schedule = {
  id: string; day_of_week: number; start_time: string; end_time: string
  slot_duration: number; is_active: boolean
}

export default function ScheduleEditor({ schedules: initial, clinicId }: { schedules: Schedule[]; clinicId: string }) {
  const [schedules, setSchedules] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '13:00', slot_duration: 30 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (form.start_time >= form.end_time) { setError('La hora de inicio debe ser anterior al fin'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.from('clinic_schedules').insert({
      clinic_id:     clinicId,
      day_of_week:   form.day_of_week,
      start_time:    form.start_time,
      end_time:      form.end_time,
      slot_duration: form.slot_duration,
      is_active:     true,
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    setSchedules(prev => [...prev, data].sort((a,b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
    setAdding(false); setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('clinic_schedules').update({ is_active: !current }).eq('id', id)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('¿Eliminar este bloque horario?')) return
    const supabase = createClient()
    await supabase.from('clinic_schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  // Calcular slots disponibles
  const countSlots = (s: Schedule) => {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    return Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / s.slot_duration)
  }

  // Agrupar por día
  const byDay: Record<number, Schedule[]> = {}
  schedules.forEach(s => { if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []; byDay[s.day_of_week].push(s) })

  const inp = "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition"
  const inpS = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', background: '#fff' }
  const f = { onFocus:(e:any)=>e.target.style.borderColor='var(--pf-coral)', onBlur:(e:any)=>e.target.style.borderColor='var(--pf-border)' }

  return (
    <div className="space-y-4">
      {/* Horarios existentes por día */}
      {[1,2,3,4,5,6,0].map(day => {
        const daySchedules = byDay[day] ?? []
        if (!daySchedules.length) return null
        return (
          <div key={day} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>{DAYS[day]}</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
              {daySchedules.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--pf-ink)' }}>
                      {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>
                      Slots de {s.slot_duration} min · {countSlots(s)} citas disponibles
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div onClick={() => toggleActive(s.id, s.is_active)}
                      className="relative w-10 h-5 rounded-full cursor-pointer transition"
                      style={{ background: s.is_active ? 'var(--pf-coral)' : '#d1d5db' }}>
                      <div className="absolute top-0.5 rounded-full bg-white w-4 h-4 transition-all"
                        style={{ left: s.is_active ? '22px' : '2px' }} />
                    </div>
                    <button onClick={() => deleteSchedule(s.id)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: '#fee2e2', color: '#dc2626' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Sin horarios */}
      {schedules.length === 0 && !adding && (
        <div className="bg-white rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <p className="text-3xl mb-3">📅</p>
          <p className="text-sm mb-1 font-medium" style={{ color: 'var(--pf-ink)' }}>Sin horario configurado</p>
          <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Añade bloques horarios para que los dueños puedan reservar citas</p>
        </div>
      )}

      {/* Formulario nuevo bloque */}
      {adding ? (
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--pf-ink)' }}>Nuevo bloque horario</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Día de la semana</label>
              <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}
                className={inp} style={inpS}>
                {DAYS.map((d,i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Hora inicio</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className={inp} style={inpS} {...f} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Hora fin</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className={inp} style={inpS} {...f} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--pf-muted)' }}>Duración de cada cita</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => setForm(f => ({ ...f, slot_duration: d }))}
                    className="px-3 py-2 rounded-xl text-sm font-medium border transition"
                    style={{
                      background: form.slot_duration === d ? 'var(--pf-coral-soft)' : '#fff',
                      borderColor: form.slot_duration === d ? 'var(--pf-coral)' : 'var(--pf-border)',
                      color: form.slot_duration === d ? 'var(--pf-coral)' : 'var(--pf-muted)',
                    }}>{d} min</button>
                ))}
              </div>
            </div>
          </div>
          {/* Preview slots */}
          <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
            ✓ Se generarán aproximadamente <strong>
              {Math.floor((parseInt(form.end_time) * 60 + parseInt(form.end_time.split(':')[1]) - parseInt(form.start_time) * 60 - parseInt(form.start_time.split(':')[1])) / form.slot_duration)} citas
            </strong> de {form.slot_duration} min entre {form.start_time} y {form.end_time}
          </div>
          {error && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setAdding(false); setError('') }}
              className="px-5 py-2.5 text-sm rounded-xl border" style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="btn-pf px-6 py-2.5 text-sm">
              {saving ? 'Guardando…' : 'Añadir bloque'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Añadir bloque horario
        </button>
      )}
    </div>
  )
}
