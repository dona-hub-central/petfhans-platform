'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PawPrint, Calendar, Clock, ClipboardList, Video, X, ExternalLink } from 'lucide-react'
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

function AppointmentModal({
  appt, onClose, onUpdate, actionLoading,
}: {
  appt: Appt
  onClose: () => void
  onUpdate: (id: string, status: string, extra?: object) => Promise<void>
  actionLoading: boolean
}) {
  const [cancelReason, setCancelReason] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const cfg = STATUS_CFG[appt.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div
        style={{ position: 'relative', background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--pf-border)', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PawPrint size={17} strokeWidth={1.75} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--pf-ink)', margin: 0 }}>{appt.pets?.name ?? 'Mascota'}</p>
              <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: 0 }}>{appt.profiles?.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pf-muted)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Info grid */}
          <div style={{ background: 'var(--pf-bg)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pf-ink)' }}>
              <Calendar size={13} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
              {new Date(appt.appointment_date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pf-ink)' }}>
              <Clock size={13} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
              {appt.appointment_time.slice(0, 5)} · {appt.duration} min
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--pf-ink)' }}>
              <ClipboardList size={13} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0, marginTop: 1 }} />
              {appt.reason}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pf-ink)' }}>
              <Video size={13} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
              {appt.is_virtual ? 'Videollamada' : 'Presencial'}
              {appt.is_virtual && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#ede9fe', color: '#6d28d9' }}>Video</span>
              )}
            </div>
          </div>

          {/* Status + video button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            {appt.is_virtual && appt.status === 'confirmed' && (
              <VetVideoJoinButton appointmentId={appt.id} petName={appt.pets?.name ?? ''} />
            )}
          </div>

          {/* Actions by status */}
          {appt.status === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={vetNotes} onChange={e => setVetNotes(e.target.value)}
                placeholder="Nota para el dueño (opcional)…"
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid var(--pf-border)', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onUpdate(appt.id, 'confirmed', { notes: vetNotes || null })}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700, borderRadius: 10, border: '1px solid #bbf7d0', background: '#edfaf1', color: '#1a7a3c', cursor: 'pointer' }}>
                  ✓ Confirmar
                </button>
                <button onClick={() => onUpdate(appt.id, 'cancelled', { cancellation_reason: cancelReason || 'Cancelada por la clínica' })}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}>
                  ✕ Rechazar
                </button>
              </div>
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Motivo de cancelación (si rechaza)…"
                style={{ width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid var(--pf-border)', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          {appt.status === 'confirmed' && (
            <button onClick={() => onUpdate(appt.id, 'completed')} disabled={actionLoading}
              style={{ width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 700, borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer' }}>
              ✓ Marcar como completada
            </button>
          )}
        </div>

        {/* Footer: link to full detail */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--pf-border)', background: 'var(--pf-bg)' }}>
          <Link href={`/vet/appointments/${appt.id}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--pf-coral)', textDecoration: 'none' }}>
            Ver información completa
            <ExternalLink size={13} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AppointmentsCalendar({
  appointments, pending, year, month, isAdmin: _isAdmin = true,
}: { appointments: Appt[]; pending: Appt[]; year: number; month: number; isAdmin?: boolean }) {

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalAppt, setModalAppt] = useState<Appt | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [apptList, setApptList] = useState(appointments)
  const [pendingList, setPendingList] = useState(pending)

  // Group by date
  const byDate: Record<string, Appt[]> = {}
  apptList.forEach(a => {
    if (!byDate[a.appointment_date]) byDate[a.appointment_date] = []
    byDate[a.appointment_date].push(a)
  })

  // Build calendar grid
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
      const updated = { status, ...(extra as Partial<Appt>) }
      setApptList(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      setPendingList(prev => prev.filter(a => a.id !== id))
      setModalAppt(prev => prev?.id === id ? { ...prev, ...updated } : prev)
    }
    setActionLoading(false)
  }

  // Sorted appointments for mobile list view
  const sortedAppts = [...apptList].sort((a, b) =>
    (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time)
  )
  const groupedByDate: Record<string, Appt[]> = {}
  sortedAppts.forEach(a => {
    if (!groupedByDate[a.appointment_date]) groupedByDate[a.appointment_date] = []
    groupedByDate[a.appointment_date].push(a)
  })

  const openModal = (a: Appt, date?: string) => {
    setModalAppt(a)
    if (date) setSelectedDate(date)
  }

  return (
    <>
    {/* Modal */}
    {modalAppt && (
      <AppointmentModal
        appt={modalAppt}
        onClose={() => setModalAppt(null)}
        onUpdate={updateAppt}
        actionLoading={actionLoading}
      />
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Left column: pending list */}
      <div className="lg:col-span-1">
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
                onClick={() => openModal(a, a.appointment_date)}>
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
      </div>

      {/* Right column: calendar (desktop) / chronological list (mobile) */}
      <div className="lg:col-span-2">

        {/* Mobile: chronological list */}
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
                          style={{ background: 'transparent' }}
                          onClick={() => openModal(a, date)}>
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

          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--pf-border)' }}>
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--pf-muted)', borderRight: '1px solid var(--pf-border)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ borderRight: '1px solid var(--pf-border)', borderBottom: '1px solid var(--pf-border)', minHeight: 80 }} />
              const ds = dateStr(day)
              const dayApptList = byDate[ds] ?? []
              const isToday = ds === today
              const isSelected = ds === selectedDate
              return (
                <div key={i} onClick={() => { setSelectedDate(ds) }}
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
                          onClick={e => { e.stopPropagation(); openModal(a, ds) }}
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

        {/* Day appointment list (desktop) */}
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
                    onClick={() => openModal(a, selectedDate)}>
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
