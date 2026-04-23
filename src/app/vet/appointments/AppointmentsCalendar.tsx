'use client'

import { useState } from 'react'
import { PawPrint, Calendar, Clock, ClipboardList, Video } from 'lucide-react'
import { VetVideoJoinButton } from '@/components/owner/VideoCallRoom'

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const STATUS_CFG = {
  pending:   { label:'Pendiente',  bg:'#fff8e6', color:'#b07800', dot:'#f59e0b' },
  confirmed: { label:'Confirmada', bg:'#edfaf1', color:'#1a7a3c', dot:'#22c55e' },
  cancelled: { label:'Cancelada',  bg:'#fee2e2', color:'#dc2626', dot:'#ef4444' },
  completed: { label:'Completada', bg:'#f0f4ff', color:'#2563eb', dot:'#3b82f6' },
}

type Appt = {
  id: string; appointment_date: string; appointment_time: string
  reason: string; status: string; duration: number; notes: string | null; cancellation_reason: string | null
  is_virtual?: boolean
  pets: { name: string; species: string } | null
  profiles: { full_name: string; email: string } | null
}

export default function AppointmentsCalendar({
  appointments, pending, year, month, isAdmin = true
}: { appointments: Appt[]; pending: Appt[]; year: number; month: number; isAdmin?: boolean }) {

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appt | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const [apptList, setApptList] = useState(appointments)
  const [pendingList, setPendingList] = useState(pending)

  // Agrupar por fecha
  const byDate: Record<string, Appt[]> = {}
  apptList.forEach(a => {
    if (!byDate[a.appointment_date]) byDate[a.appointment_date] = []
    byDate[a.appointment_date].push(a)
  })

  // Generar calendario
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)]
  const today = new Date().toISOString().split('T')[0]

  const dateStr = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const dayAppts = selectedDate ? (byDate[selectedDate] ?? []) : []

  const updateAppt = async (id: string, status: string, extra: object = {}) => {
    setActionLoading(true)
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    if (res.ok) {
      setApptList(prev => prev.map(a => a.id === id ? { ...a, status, ...extra } : a))
      setPendingList(prev => prev.filter(a => a.id !== id))
      if (selectedAppt?.id === id) setSelectedAppt(prev => prev ? { ...prev, status, ...extra as any } : null)
    }
    setActionLoading(false)
    setCancelReason(''); setVetNotes('')
  }

  // Sorted list of all appointments for mobile view
  const sortedAppts = [...apptList].sort((a, b) =>
    (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time)
  )
  const groupedByDate: Record<string, Appt[]> = {}
  sortedAppts.forEach(a => {
    if (!groupedByDate[a.appointment_date]) groupedByDate[a.appointment_date] = []
    groupedByDate[a.appointment_date].push(a)
  })

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Columna izquierda: pendientes */}
      <div className="lg:col-span-1 space-y-4">
        {/* Pendientes */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>⏳ Por confirmar</h3>
            {pendingList.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff8e6', color: '#b07800' }}>
                {pendingList.length}
              </span>
            )}
          </div>
          <div className="divide-y max-h-96 overflow-y-auto" style={{ borderColor: 'var(--pf-border)' }}>
            {pendingList.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--pf-muted)' }}>Sin citas pendientes</p>
            ) : pendingList.map(a => (
              <div key={a.id} className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => { setSelectedAppt(a); setSelectedDate(a.appointment_date) }}>
                <div className="flex items-center gap-2 mb-1">
                  <PawPrint size={14} strokeWidth={1.75} style={{ color: 'var(--pf-coral)', flexShrink: 0 }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--pf-ink)' }}>{a.pets?.name}</span>
                  {a.is_virtual && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:'#ede9fe', color:'#6d28d9' }}>
                      <Video size={9} strokeWidth={2.5} /> Video
                    </span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: 'var(--pf-muted)' }}>
                    {a.appointment_time.slice(0,5)}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>
                  {new Date(a.appointment_date + 'T12:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' })} · {a.profiles?.full_name}
                </p>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--pf-ink)' }}>{a.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle cita seleccionada */}
        {selectedAppt && (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>Detalle de cita</h3>
              <button onClick={() => setSelectedAppt(null)} style={{ color: 'var(--pf-muted)', fontSize: 18 }}>×</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                  <PawPrint size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--pf-ink)' }}>{selectedAppt.pets?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>{selectedAppt.profiles?.full_name} · {selectedAppt.profiles?.email}</p>
                </div>
              </div>
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--pf-bg)' }}>
                <p className="text-xs flex items-center gap-1.5"><Calendar size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} /> {new Date(selectedAppt.appointment_date + 'T12:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}</p>
                <p className="text-xs flex items-center gap-1.5"><Clock size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} /> {selectedAppt.appointment_time.slice(0,5)}</p>
                <p className="text-xs flex items-center gap-1.5"><ClipboardList size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} /> {selectedAppt.reason}</p>
                <p className="text-xs flex items-center gap-1.5">
                  <Video size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
                  {selectedAppt.is_virtual ? 'Videollamada' : 'Presencial'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: STATUS_CFG[selectedAppt.status as keyof typeof STATUS_CFG]?.bg, color: STATUS_CFG[selectedAppt.status as keyof typeof STATUS_CFG]?.color }}>
                  {STATUS_CFG[selectedAppt.status as keyof typeof STATUS_CFG]?.label}
                </span>
                {selectedAppt.is_virtual && selectedAppt.status === 'confirmed' && (
                  <VetVideoJoinButton appointmentId={selectedAppt.id} petName={selectedAppt.pets?.name ?? ''} />
                )}
              </div>

              {/* Acciones según estado */}
              {selectedAppt.status === 'pending' && (
                <div className="space-y-2 pt-1">
                  <input value={vetNotes} onChange={e => setVetNotes(e.target.value)}
                    placeholder="Nota para el dueño (opcional)…"
                    className="w-full px-3 py-2 text-xs border rounded-xl outline-none"
                    style={{ borderColor: 'var(--pf-border)' }} />
                  <div className="flex gap-2">
                    <button onClick={() => updateAppt(selectedAppt.id, 'confirmed', { notes: vetNotes || null })}
                      disabled={actionLoading}
                      className="flex-1 py-2 text-xs font-bold rounded-xl transition"
                      style={{ background: '#edfaf1', color: '#1a7a3c', border: '1px solid #bbf7d0' }}>
                      ✓ Confirmar
                    </button>
                    <button onClick={() => updateAppt(selectedAppt.id, 'cancelled', { cancellation_reason: cancelReason || 'Cancelada por la clínica' })}
                      disabled={actionLoading}
                      className="flex-1 py-2 text-xs font-bold rounded-xl transition"
                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                      ✕ Rechazar
                    </button>
                  </div>
                  <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    placeholder="Motivo de cancelación (si rechaza)…"
                    className="w-full px-3 py-2 text-xs border rounded-xl outline-none"
                    style={{ borderColor: 'var(--pf-border)' }} />
                </div>
              )}
              {selectedAppt.status === 'confirmed' && (
                <button onClick={() => updateAppt(selectedAppt.id, 'completed')} disabled={actionLoading}
                  className="w-full py-2 text-xs font-bold rounded-xl"
                  style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                  ✓ Marcar como completada
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Columna derecha: calendario (desktop) / lista cronológica (mobile) */}
      <div className="lg:col-span-2">

        {/* Mobile: lista cronológica de citas del mes */}
        <div className="appt-mob-list">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>{MONTHS[month]} {year}</h3>
            </div>
            {Object.keys(groupedByDate).length === 0 ? (
              <p className="px-5 py-10 text-sm text-center" style={{ color: 'var(--pf-muted)' }}>Sin citas este mes</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
                {Object.entries(groupedByDate).map(([date, appts]) => (
                  <div key={date}>
                    <div className="px-4 py-2" style={{ background: 'var(--pf-bg)' }}>
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--pf-muted)' }}>
                        {new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {date === today && <span style={{ marginLeft: 6, color: 'var(--pf-coral)', fontWeight: 700 }}>· Hoy</span>}
                      </span>
                    </div>
                    {appts.map(a => {
                      const cfg = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending
                      return (
                        <div key={a.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                          style={{ background: selectedAppt?.id === a.id ? 'var(--pf-coral-soft)' : 'transparent' }}
                          onClick={() => { setSelectedAppt(a); setSelectedDate(date) }}>
                          <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--pf-ink)', width: 40 }}>{a.appointment_time.slice(0,5)}</span>
                          <PawPrint size={15} strokeWidth={1.75} style={{ color: 'var(--pf-coral)', flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--pf-ink)', margin: 0 }}>{a.pets?.name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--pf-muted)', margin: 0 }}>{a.profiles?.full_name} · {a.reason}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Desktop calendar grid */}
        <div className="appt-desk-cal bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          {/* Cabecera mes */}
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--pf-ink)' }}>{MONTHS[month]} {year}</h3>
            <div className="flex gap-3">
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid días semana */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--pf-border)' }}>
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--pf-muted)', borderRight: '1px solid var(--pf-border)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid celdas */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ borderRight: '1px solid var(--pf-border)', borderBottom: '1px solid var(--pf-border)', minHeight: 80 }} />
              const ds = dateStr(day)
              const dayApptList = byDate[ds] ?? []
              const isToday = ds === today
              const isSelected = ds === selectedDate
              return (
                <div key={i} onClick={() => { setSelectedDate(ds); setSelectedAppt(null) }}
                  className="cursor-pointer transition"
                  style={{
                    borderRight: '1px solid var(--pf-border)',
                    borderBottom: '1px solid var(--pf-border)',
                    minHeight: 80, padding: '6px 8px',
                    background: isSelected ? 'var(--pf-coral-soft)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f9f9f9' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <span className="text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full mb-1"
                    style={{
                      background: isToday ? 'var(--pf-coral)' : 'transparent',
                      color: isToday ? '#fff' : 'var(--pf-ink)',
                    }}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayApptList.slice(0,3).map(a => {
                      const cfg = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending
                      return (
                        <div key={a.id}
                          onClick={e => { e.stopPropagation(); setSelectedAppt(a); setSelectedDate(ds) }}
                          className="text-xs rounded px-1 py-0.5 truncate cursor-pointer"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {a.appointment_time.slice(0,5)} {a.pets?.name}
                        </div>
                      )
                    })}
                    {dayApptList.length > 3 && (
                      <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>+{dayApptList.length - 3} más</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista del día seleccionado */}
        {selectedDate && dayAppts.length > 0 && (
          <div className="bg-white rounded-2xl border mt-4 overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
              <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
                <Calendar size={13} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
                {new Date(selectedDate + 'T12:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
              {dayAppts.map(a => {
                const cfg = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending
                return (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedAppt(a)}>
                    <span className="text-sm font-bold w-12 flex-shrink-0" style={{ color: 'var(--pf-ink)' }}>{a.appointment_time.slice(0,5)}</span>
                    <PawPrint size={16} strokeWidth={1.75} style={{ color: 'var(--pf-coral)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--pf-ink)' }}>{a.pets?.name} · {a.profiles?.full_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--pf-muted)' }}>{a.reason}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    <style>{`
      .appt-mob-list { display: none; }
      @media (max-width: 767px) {
        .appt-desk-cal { display: none !important; }
        .appt-mob-list { display: block !important; }
      }
    `}</style>
    </>
  )
}
