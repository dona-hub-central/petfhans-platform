'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Video, MapPin, Zap, Calendar, PawPrint,
  ChevronLeft, CheckCircle, Store,
} from 'lucide-react'

type WizardPet = {
  id: string
  name: string
  species: string
  breed: string | null
  clinic_id: string | null
}

type WizardClinic = {
  id: string
  name: string
  allows_virtual: boolean
}

type Step = 'pet' | 'type' | 'modality' | 'form' | 'success'

const SPECIES: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

export default function BookingWizard({
  pets,
  clinics,
}: {
  pets: WizardPet[]
  clinics: Record<string, WizardClinic>
}) {
  const router = useRouter()
  const single = pets.length === 1

  const [step, setStep]       = useState<Step>(single ? 'type' : 'pet')
  const [petId, setPetId]     = useState(single ? pets[0].id : '')
  const [isUrgent, setUrgent] = useState(false)
  const [isVirtual, setVirt]  = useState(false)
  const [reason, setReason]   = useState('')
  const [meds, setMeds]       = useState('')
  const [date, setDate]       = useState('')
  const [time, setTime]       = useState('')
  const [slots, setSlots]     = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [newId, setNewId]     = useState('')

  const pet    = pets.find(p => p.id === petId)
  const clinic = pet?.clinic_id ? clinics[pet.clinic_id] : undefined
  const allowsVirtual = clinic ? clinic.allows_virtual : true

  const loadSlots = async (d: string) => {
    setDate(d); setTime(''); setSlots([])
    if (!d || !pet?.clinic_id) return
    setLoadingSlots(true)
    const res  = await fetch(`/api/appointments/slots?clinic_id=${pet.clinic_id}&date=${d}`)
    const data = await res.json() as { slots?: string[] }
    setSlots(data.slots ?? [])
    setLoadingSlots(false)
  }

  const submit = async () => {
    if (!reason.trim()) { setError('Describe el motivo de la consulta'); return }
    if (!date || !time)  { setError('Elige fecha y hora'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/appointments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id:           petId,
        appointment_date: date,
        appointment_time: time + ':00',
        reason: (isUrgent ? '[URGENTE] ' : '') + reason.trim() + (meds.trim() ? ` | Medicación: ${meds.trim()}` : ''),
        urgency:    isUrgent ? 'urgente' : 'normal',
        is_virtual: isVirtual,
      }),
    })
    const data = await res.json() as { error?: string; appointment?: { id: string } }
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Error al solicitar cita'); return }
    setNewId(data.appointment?.id ?? '')
    setStep('success')
  }

  const minDate = (() => {
    const d = new Date()
    if (!isUrgent) d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  const goBack = () => {
    if (step === 'type')     { if (!single) setStep('pet') }
    else if (step === 'modality') setStep('type')
    else if (step === 'form')     setStep('modality')
  }
  const showBack = !(step === 'type' && single) && step !== 'pet' && step !== 'success'

  // ── Pet selection ─────────────────────────────────────────────
  if (step === 'pet') {
    return (
      <div>
        <Header title="Pedir cita" sub="¿Para qué mascota?" />
        {pets.length === 0 ? <NoPets /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pets.map(p => (
              <button key={p.id} onClick={() => { setPetId(p.id); setStep('type') }} style={petCard}>
                <span style={petIcon}><PawPrint size={20} strokeWidth={1.75} /></span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={petName}>{p.name}</span>
                  <span style={petSub}>{SPECIES[p.species] ?? p.species}{p.breed ? ` · ${p.breed}` : ''}</span>
                </span>
                <span style={{ color: 'var(--pf-hint)', fontSize: 20 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Appointment type ──────────────────────────────────────────
  if (step === 'type') {
    return (
      <div>
        {showBack && <BackBtn onClick={goBack} />}
        <Header title="¿Qué tipo de consulta?" sub={pet ? `Para ${pet.name}` : undefined} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SelectCard
            Icon={Zap}
            title="Urgente"
            sub="Necesita atención lo antes posible"
            onClick={() => { setUrgent(true); setStep('modality') }}
          />
          <SelectCard
            Icon={Calendar}
            title="Consulta programada"
            sub="Reserva un horario con anticipación"
            onClick={() => { setUrgent(false); setStep('modality') }}
          />
        </div>
      </div>
    )
  }

  // ── Modality ──────────────────────────────────────────────────
  if (step === 'modality') {
    return (
      <div>
        <BackBtn onClick={goBack} />
        <Header title="¿Cómo prefieres la consulta?" sub={clinic?.name} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allowsVirtual && (
            <SelectCard
              Icon={Video}
              title="Videollamada"
              sub="Consulta virtual desde casa"
              onClick={() => { setVirt(true); setStep('form') }}
            />
          )}
          <SelectCard
            Icon={MapPin}
            title="Presencial"
            sub="Visita la clínica en persona"
            onClick={() => { setVirt(false); setStep('form') }}
          />
        </div>
      </div>
    )
  }

  // ── Booking form ──────────────────────────────────────────────
  if (step === 'form') {
    if (!clinic) {
      return (
        <div>
          <BackBtn onClick={goBack} />
          <Header title="Sin clínica asignada" />
          <div style={noClinicCard}>
            <div style={{ color: 'var(--pf-coral)', marginBottom: 12 }}>
              <PawPrint size={40} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
              {pet?.name ?? 'Tu mascota'} aún no está vinculada a ninguna clínica
            </p>
            <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Encuentra una clínica en el Marketplace y solicita atención para poder reservar citas.
            </p>
            <Link href="/marketplace/clinicas" style={ctaLink}>
              <Store size={15} strokeWidth={2} />
              Ir al Marketplace
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div>
        <BackBtn onClick={goBack} />
        <Header
          title="Detalles de la cita"
          sub={`${isVirtual ? 'Videollamada' : 'Presencial'} · ${clinic.name}`}
        />

        {isUrgent && (
          <div style={urgentBadge}>
            <Zap size={13} strokeWidth={2.5} />
            Consulta urgente
          </div>
        )}

        <div style={field}>
          <label style={lbl}>¿Qué le pasa? *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder={`Describe el motivo de la consulta de ${pet?.name ?? 'tu mascota'}…`}
            style={ta}
          />
        </div>

        <div style={field}>
          <label style={lbl}>
            ¿Toma medicación?{' '}
            <span style={{ fontWeight: 400, color: 'var(--pf-hint)' }}>(opcional)</span>
          </label>
          <input
            value={meds}
            onChange={e => setMeds(e.target.value)}
            placeholder="Ej: Amoxicilina 250mg, ninguno…"
            style={inp}
          />
        </div>

        <div style={field}>
          <label style={lbl}>¿Cuándo?</label>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={e => loadSlots(e.target.value)}
            style={inp}
          />
        </div>

        {date && (
          <div style={field}>
            <label style={lbl}>Hora</label>
            {loadingSlots ? (
              <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>Cargando horarios…</p>
            ) : slots.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--pf-danger)', margin: 0 }}>
                Sin horarios disponibles. Prueba con otro día.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <button key={s} type="button" onClick={() => setTime(s)} style={slotBtn(s === time)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p style={errStyle}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={goBack} style={secBtn}>Atrás</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !date || !time || !reason.trim()}
            style={priBtn(saving || !date || !time || !reason.trim())}
          >
            {saving ? 'Enviando…' : 'Solicitar cita'}
          </button>
        </div>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <div style={{ color: 'var(--pf-success)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <CheckCircle size={56} strokeWidth={1.5} />
      </div>
      <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        ¡Solicitud enviada!
      </h2>
      <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 28px', lineHeight: 1.5 }}>
        Te avisaremos cuando la clínica confirme la cita.
      </p>
      <button
        onClick={() => router.push(`/owner/appointments${newId ? `?new=${newId}` : ''}`)}
        style={{ ...priBtn(false), display: 'inline-flex', width: 'auto', padding: '12px 28px' }}
      >
        Ver historial de citas
      </button>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 24, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, letterSpacing: '-0.01em' }}>
        {title}
      </h1>
      {sub && (
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '4px 0 0' }}>
          {sub}
        </p>
      )}
    </header>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pf-muted)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', padding: '0 0 18px' }}>
      <ChevronLeft size={16} strokeWidth={2} />
      Atrás
    </button>
  )
}

function SelectCard({ Icon, title, sub, onClick }: {
  Icon: typeof Calendar; title: string; sub: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '16px 14px', borderRadius: 16, border: '0.5px solid var(--pf-border)', background: 'var(--pf-white)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color .15s, background .15s' }}>
      <span style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'var(--pf-surface)', color: 'var(--pf-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontFamily: 'var(--pf-font-body)', fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)' }}>
          {title}
        </span>
        <span style={{ display: 'block', fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', marginTop: 3 }}>
          {sub}
        </span>
      </span>
      <span style={{ color: 'var(--pf-hint)', fontSize: 20, flexShrink: 0 }}>›</span>
    </button>
  )
}

function NoPets() {
  return (
    <div style={{ background: 'var(--pf-white)', borderRadius: 20, border: '0.5px solid var(--pf-border)', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ color: 'var(--pf-coral)', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <PawPrint size={40} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px', fontFamily: 'var(--pf-font-display)' }}>
        Sin mascotas registradas
      </p>
      <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 20px' }}>
        Registra tu mascota para poder pedir cita
      </p>
      <Link href="/owner/pets/new" style={ctaLink}>
        <PawPrint size={15} strokeWidth={2} />
        Añadir mascota
      </Link>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const petCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
  padding: 14, borderRadius: 16, border: '0.5px solid var(--pf-border)',
  background: 'var(--pf-white)', cursor: 'pointer', fontFamily: 'inherit',
}
const petIcon: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
  background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const petName: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--pf-font-body)', fontSize: 15, fontWeight: 600, color: 'var(--pf-ink)',
}
const petSub: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', marginTop: 2,
}
const noClinicCard: React.CSSProperties = {
  background: 'var(--pf-white)', borderRadius: 20, border: '0.5px solid var(--pf-border)',
  padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
}
const ctaLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 20px', borderRadius: 10,
  background: 'var(--pf-coral)', color: '#fff',
  textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: 'var(--pf-font-body)',
}
const urgentBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: '#fff8e6', color: '#b07800',
  padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
  marginBottom: 16, fontFamily: 'var(--pf-font-body)',
}
const field: React.CSSProperties = { marginBottom: 14 }
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--pf-muted)',
  marginBottom: 7, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: 'var(--pf-font-body)',
}
const ta: React.CSSProperties = {
  width: '100%', border: 'none', background: 'var(--pf-surface)', borderRadius: 14,
  padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'none',
  boxSizing: 'border-box', outline: 'none', color: 'var(--pf-ink)',
}
const inp: React.CSSProperties = {
  width: '100%', border: 'none', background: 'var(--pf-surface)', borderRadius: 14,
  padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
  boxSizing: 'border-box', outline: 'none', color: 'var(--pf-ink)',
}
const slotBtn = (active: boolean): React.CSSProperties => ({
  border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  background: active ? 'var(--pf-coral)' : 'var(--pf-surface)',
  color: active ? '#fff' : 'var(--pf-ink)',
})
const priBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 2, border: 'none', borderRadius: 14, padding: 14,
  background: 'var(--pf-coral)', color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit', opacity: disabled ? 0.55 : 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const secBtn: React.CSSProperties = {
  flex: 1, border: 'none', borderRadius: 14, padding: 14,
  background: 'var(--pf-surface)', color: 'var(--pf-muted)',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const errStyle: React.CSSProperties = {
  color: 'var(--pf-danger)', fontSize: 13, margin: '0 0 12px', fontWeight: 500,
  fontFamily: 'var(--pf-font-body)',
}
