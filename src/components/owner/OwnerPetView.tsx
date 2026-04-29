'use client'

import { useState, useRef, useEffect } from 'react'
import PetAvatar from '@/components/shared/PetAvatar'
import PetGallery from '@/components/owner/PetGallery'
import BookAppointment from '@/components/owner/BookAppointment'
import { PawPrint, Calendar, Camera, FileText, ClipboardList, Video, MapPin, Sparkles, Pill, Microscope, Paperclip, Utensils, Activity, ShieldCheck, type LucideIcon } from 'lucide-react'
import VideoCallRoom from '@/components/owner/VideoCallRoom'
import EmergencyCall from '@/components/owner/EmergencyCall'
import type { Pet, PetFile, PetFileWithUrl, RecordWithVet, AppointmentSummary } from '@/types'

type Tab = 'info' | 'galeria' | 'docs' | 'historial' | 'citas' | 'recetas'

const TABS: { key: Tab; Icon: LucideIcon; label: string }[] = [
  { key: 'info',      Icon: PawPrint,      label: 'Ficha' },
  { key: 'citas',     Icon: Calendar,      label: 'Citas' },
  { key: 'galeria',   Icon: Camera,        label: 'Galería' },
  { key: 'docs',      Icon: FileText,      label: 'Docs' },
  { key: 'historial', Icon: ClipboardList, label: 'Historial' },
  { key: 'recetas',   Icon: Sparkles,      label: 'IA Tips' },
]

const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro'
}

export default function OwnerPetView({ pet, records, photos, docs, appointments, clinicName, clinicId }: {
  pet: Pet
  records: RecordWithVet[]
  photos: PetFileWithUrl[]
  docs: PetFile[]
  appointments: AppointmentSummary[]
  clinicName: string
  clinicId?: string
}) {
  const [tab, setTab] = useState<Tab>('info')
  const nextVisit = records.find(r => r.next_visit && new Date(r.next_visit) > new Date())

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:var(--pf-bg); font-family:var(--pf-font-body); }

        /* ── MOBILE (default) ── */
        .pet-shell { min-height:100svh; display:flex; flex-direction:column; }

        .hero { background:linear-gradient(170deg,var(--pf-coral) 0%,#f9a394 100%); flex-shrink:0; }
        .hero-nav { padding:44px 18px 0; display:flex; align-items:center; }
        .back-link { color:rgba(255,255,255,.9); font-size:15px; text-decoration:none; }
        .hero-body { padding:16px 18px 0; display:flex; align-items:flex-end; gap:14px; }
        .hero-info { flex:1; padding-bottom:16px; }
        .pet-name { color:#fff; font-size:28px; font-weight:800; margin:0 0 3px; font-family:var(--pf-font-display); letter-spacing:-0.01em; }
        .pet-sub  { color:rgba(255,255,255,.8); font-size:13px; margin:0 0 8px; }
        .next-badge { display:inline-flex; align-items:center; gap:4px; background:rgba(255,255,255,.22); color:#fff; font-size:12px; font-weight:600; padding:4px 12px; border-radius:20px; }

        .mob-tabs { display:flex; background:rgba(0,0,0,.15); overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .mob-tabs::-webkit-scrollbar { display:none; }
        .mob-tab { flex:none; border:none; background:none; cursor:pointer; color:rgba(255,255,255,.55); padding:11px 14px 9px; font-size:11px; font-weight:600; font-family:inherit; border-bottom:2.5px solid transparent; transition:all .15s; display:flex; flex-direction:column; align-items:center; gap:2px; white-space:nowrap; }
        .mob-tab.active { color:#fff; border-bottom-color:#fff; }

        .scroll-area { flex:1; overflow-y:auto; padding:14px 14px 36px; -webkit-overflow-scrolling:touch; }

        /* Cards */
        .card { background:var(--pf-white); border-radius:18px; overflow:hidden; margin-bottom:10px; }
        .card-title { font-size:10.5px; font-weight:700; color:var(--pf-muted); text-transform:uppercase; letter-spacing:.07em; padding:12px 16px 0; margin:0; }
        .info-row { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-top:1px solid var(--pf-bg); font-size:14px; }
        .info-row:first-of-type { border-top:none; }
        .lbl { color:var(--pf-muted); } .val { font-weight:600; color:var(--pf-ink); }
        .empty-box { text-align:center; padding:48px 20px; background:var(--pf-white); border-radius:18px; }

        .rec-card { background:var(--pf-white); border-radius:18px; padding:14px 16px; margin-bottom:8px; }
        .rec-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .rec-date { background:var(--pf-coral-soft); color:var(--pf-coral); font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
        .rec-vet { font-size:11px; color:var(--pf-muted); }
        .rec-reason { font-size:15px; font-weight:700; color:var(--pf-ink); margin:0 0 4px; }
        .rec-detail { font-size:12px; color:var(--pf-muted); margin:2px 0; }
        .rec-next { font-size:12px; color:var(--pf-coral); font-weight:600; margin:8px 0 0; display:flex; align-items:center; gap:4px; }

        /* ── DESKTOP (≥768px) ── */
        @media (min-width:768px) {
          html, body { background:var(--pf-bg); }
          .pet-shell { min-height:100vh; flex-direction:column; max-width:1100px; margin:0 auto; padding:0 24px; }

          .hero { background:none; border-radius:0; flex-shrink:0; }
          .hero-nav { padding:28px 0 0; }
          .back-link { color:var(--pf-coral); font-size:14px; }
          .hero-body { padding:20px 0 0; align-items:center; gap:20px; }
          .hero-info { padding-bottom:0; }
          .pet-name { color:var(--pf-ink); font-size:32px; }
          .pet-sub  { color:var(--pf-muted); }
          .next-badge { background:var(--pf-coral-soft); color:var(--pf-coral); }

          .mob-tabs { background:none; border-bottom:0.5px solid var(--pf-border); margin-top:24px; gap:0; overflow-x:visible; }
          .mob-tab { flex:none; padding:10px 20px 10px; color:var(--pf-muted); border-bottom:2.5px solid transparent; border-radius:0; font-size:13px; flex-direction:row; gap:6px; }
          .mob-tab.active { color:var(--pf-coral); border-bottom-color:var(--pf-coral); }
          .mob-tab.active.ai-tab { color:var(--pf-info-fg); border-bottom-color:var(--pf-info-fg); }

          .scroll-area { padding:24px 0 48px; flex:none; overflow-y:visible; }
          .desk-grid { display:grid; grid-template-columns:300px 1fr; gap:20px; align-items:start; }
          .card { border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,.07); }
          .card-title { font-size:11px; padding:14px 18px 0; }
          .info-row { padding:11px 18px; font-size:14px; }
          .rec-card { border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,.07); }
          .empty-box { border-radius:16px; }
        }
      `}</style>

      <div className="pet-shell">
        {/* HERO */}
        <div className="hero">
          <div className="hero-nav">
            <a href="/owner/dashboard" className="back-link">‹ Mis mascotas</a>
          </div>
          <div className="hero-body">
            <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url} size={80} editable={true} />
            <div className="hero-info">
              <h1 className="pet-name">{pet.name}</h1>
              <p className="pet-sub">
                {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                {pet.weight ? ` · ${pet.weight} kg` : ''}
              </p>
              {nextVisit && (
                <span className="next-badge">
                  <Calendar size={12} strokeWidth={2.2} />
                  {nextVisit.next_visit && new Date(nextVisit.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mob-tabs">
            {TABS.map(({ key, Icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`mob-tab${tab===key?' active':''}${key==='recetas'?' ai-tab':''}`}>
                <Icon size={17} strokeWidth={2} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="scroll-area">
          <div className="desk-grid">

            {/* Columna izquierda — solo visible en desktop como sidebar */}
            <div className="desk-sidebar">
              {tab === 'info' && (
                <>
                  <DataCard pet={pet} clinicName={clinicName} />
                </>
              )}
              {tab !== 'info' && (
                <div className="card" style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url} size={52} editable={false} />
                    <div>
                      <p style={{ fontWeight:700, fontSize:15, color:'var(--pf-ink)', margin:0, fontFamily:'var(--pf-font-display)' }}>{pet.name}</p>
                      <p style={{ fontSize:12, color:'var(--pf-muted)', margin:'2px 0 0' }}>{speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                    </div>
                  </div>
                  {clinicName && <p style={{ fontSize:12, color:'var(--pf-muted)', margin:'10px 0 0', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13"/><path d="M10 21v-6h4v6"/></svg>
                    {clinicName}
                  </p>}
                </div>
              )}
            </div>

            {/* Columna derecha — contenido principal */}
            <div>
              {tab === 'info'     && <InfoDesktop pet={pet} clinicName={clinicName} nextVisit={nextVisit} records={records} />}
              {tab === 'galeria'  && <PetGallery petId={pet.id} initialPhotos={photos} />}
              {tab === 'citas'    && <CitasTab petId={pet.id} petName={pet.name} clinicId={clinicId} appointments={appointments} />}
              {tab === 'docs'     && <DocsTab petId={pet.id} initialDocs={docs} />}
              {tab === 'historial'&& <HistorialTab petId={pet.id} records={records} />}
              {tab === 'recetas'  && <RecetasTab petId={pet.id} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sub-componentes ── */

function DataCard({ pet, clinicName }: { pet: Pet; clinicName: string }) {
  return (
    <>
      <div className="card">
        <p className="card-title">Datos</p>
        {[
          ['Especie', speciesLabel[pet.species]],
          ['Raza', pet.breed||'—'],
          ['Sexo', pet.gender==='male'?'♂ Macho':'♀ Hembra'],
          ['Edad', pet.birth_date ? getAge(pet.birth_date) : '—'],
          ['Peso', pet.weight ? `${pet.weight} kg` : '—'],
          ['Castrado/a', pet.neutered?'Sí ✓':'No'],
          ['Microchip', pet.microchip||'—'],
        ].map(([l,v]) => (
          <div key={l} className="info-row"><span className="lbl">{l}</span><span className="val">{v}</span></div>
        ))}
      </div>
      {clinicName && (
        <div className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:'var(--pf-surface)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pf-muted)', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13"/><path d="M10 21v-6h4v6"/></svg>
          </div>
          <div>
            <p style={{ fontSize:10, color:'var(--pf-muted)', margin:'0 0 1px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em' }}>Centro</p>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--pf-ink)', margin:0 }}>{clinicName}</p>
          </div>
        </div>
      )}
    </>
  )
}

function InfoDesktop({ pet, clinicName, nextVisit, records }: {
  pet: Pet
  clinicName: string
  nextVisit: RecordWithVet | undefined
  records: RecordWithVet[]
}) {
  return (
    <>
      {/* En mobile muestra todo junto, en desktop solo complementa */}
      <div style={{ display:'none' }} className="mobile-info-extra">
        <DataCard pet={pet} clinicName={clinicName} />
      </div>
      {pet.notes && (
        <div className="card">
          <p className="card-title">Notas</p>
          <p style={{ padding:'10px 16px 14px', fontSize:14, color:'var(--pf-ink)', lineHeight:1.6, margin:0 }}>{pet.notes}</p>
        </div>
      )}
      {nextVisit && (
        <div className="card" style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12, background:'var(--pf-coral-soft)' }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'var(--pf-white)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pf-coral)', flexShrink:0 }}>
            <Calendar size={22} strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--pf-coral-dark)', fontWeight:700, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.07em' }}>Próxima visita</p>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--pf-ink)', margin:0 }}>
              {nextVisit.next_visit && new Date(nextVisit.next_visit).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
        </div>
      )}
      {records.length > 0 && (
        <div className="card">
          <p className="card-title">Últimas consultas</p>
          {records.slice(0,3).map((r:any) => (
            <div key={r.id} style={{ padding:'10px 16px', borderTop:'1px solid var(--pf-bg)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--pf-ink)', margin:0 }}>{r.reason}</p>
                <span style={{ fontSize:11, color:'var(--pf-muted)' }}>{new Date(r.visit_date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</span>
              </div>
              {r.diagnosis && <p style={{ fontSize:12, color:'var(--pf-muted)', margin:'2px 0 0' }}>Dx: {r.diagnosis}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

const DOC_TYPES: { value: string; Icon: LucideIcon; label: string }[] = [
  { value: 'prescription', Icon: Pill,       label: 'Receta' },
  { value: 'exam',         Icon: Microscope, label: 'Examen' },
  { value: 'other',        Icon: Paperclip,  label: 'Otro'   },
]

function DocsTab({ petId, initialDocs }: { petId: string; initialDocs: PetFile[] }) {
  const [docs, setDocs] = useState(initialDocs)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileType, setFileType] = useState('prescription')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file); fd.append('pet_id', petId)
    fd.append('file_type', fileType); fd.append('notes', notes)
    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setUploading(false); return }
      setDocs(prev => [data.file, ...prev])
      setShowForm(false); setFile(null); setNotes('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    setUploading(false)
  }

  return (
    <>
      <button onClick={() => setShowForm(!showForm)} style={{
        width:'100%', border:'none', borderRadius:18, padding:'14px 16px',
        background:'var(--pf-coral)', color:'var(--pf-white)', fontFamily:'inherit',
        fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:12,
      }}>+ Añadir documento</button>

      {showForm && (
        <form onSubmit={upload} style={{ background:'var(--pf-white)', borderRadius:18, padding:18, marginBottom:12 }}>
          <p style={{ fontWeight:700, fontSize:15, color:'var(--pf-ink)', margin:'0 0 12px' }}>Nuevo documento</p>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {DOC_TYPES.map(({ value, Icon, label }) => (
              <button key={value} type="button" onClick={() => setFileType(value)}
                style={{ flex:1, border:'none', borderRadius:12, padding:'10px 4px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  background: fileType===value ? 'var(--pf-coral-soft)' : 'var(--pf-surface)',
                  color:      fileType===value ? 'var(--pf-coral)'      : 'var(--pf-muted)',
                  outline:    fileType===value ? '2px solid var(--pf-coral)' : 'none' }}>
                <Icon size={15} strokeWidth={2} />{label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Descripción (opcional)" value={notes} onChange={e => setNotes(e.target.value)}
            style={{ width:'100%', border:'none', background:'var(--pf-surface)', borderRadius:12, padding:'12px 14px', fontSize:14, fontFamily:'inherit', marginBottom:10, boxSizing:'border-box' }} />
          <div onClick={() => inputRef.current?.click()} style={{
            border:'2px dashed var(--pf-border-md)', borderRadius:12, padding:'18px', textAlign:'center', cursor:'pointer', marginBottom:12, background:'var(--pf-surface)',
          }}>
            <p style={{ margin:0, fontSize:13, color: file ? 'var(--pf-ink)' : 'var(--pf-muted)', fontWeight: file ? 600 : 400 }}>
              {file ? `✓ ${file.name}` : 'Toca para seleccionar archivo'}
            </p>
            <input ref={inputRef} type="file" style={{ display:'none' }} accept=".pdf,.doc,.docx,image/*"
              onChange={e => { setFile(e.target.files?.[0] || null); setError('') }} />
          </div>
          {error && <p style={{ color:'var(--pf-danger-fg)', fontSize:13, margin:'0 0 10px' }}>{error}</p>}
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              style={{ flex:1, border:'none', borderRadius:12, padding:13, background:'var(--pf-surface)', color:'var(--pf-muted)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            <button type="submit" disabled={uploading}
              style={{ flex:2, border:'none', borderRadius:12, padding:13, background:'var(--pf-coral)', color:'var(--pf-white)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: uploading ? .6 : 1 }}>
              {uploading ? 'Subiendo…' : 'Subir'}</button>
          </div>
        </form>
      )}

      {docs.length === 0 && !showForm
        ? <div className="empty-box">
            <Paperclip size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
            <p style={{ fontSize:14, color:'var(--pf-muted)', margin:0 }}>Sin documentos aún</p>
          </div>
        : docs.map((d) => <DocCard key={d.id} doc={d} />)
      }
    </>
  )
}

function HistorialTab({ petId, records }: { petId: string; records: RecordWithVet[] }) {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim() && !file) return
    setSaving(true)
    if (file) {
      const fd = new FormData()
      fd.append('file', file); fd.append('pet_id', petId)
      fd.append('file_type', 'other'); fd.append('notes', note || 'Observación del dueño')
      await fetch('/api/files/upload', { method: 'POST', body: fd, credentials: 'include' })
    }
    setSaving(false); setOk(true); setShowNote(false); setNote(''); setFile(null)
    setTimeout(() => setOk(false), 3000)
  }

  return (
    <>
      <button onClick={() => setShowNote(!showNote)} style={{
        width:'100%', border:'2px solid var(--pf-coral)', borderRadius:18, padding:'13px 16px',
        background:'var(--pf-white)', color:'var(--pf-coral)', fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:12,
      }}>+ Añadir observación</button>
      {ok && <p style={{ color:'var(--pf-success-fg)', fontSize:13, textAlign:'center', margin:'0 0 10px' }}>✓ Guardado</p>}
      {showNote && (
        <form onSubmit={submit} style={{ background:'var(--pf-white)', borderRadius:18, padding:16, marginBottom:12 }}>
          <textarea placeholder="Escribe una observación sobre tu mascota…" value={note} onChange={e => setNote(e.target.value)} rows={3}
            style={{ width:'100%', border:'none', background:'var(--pf-surface)', borderRadius:12, padding:'12px 14px', fontSize:14, fontFamily:'inherit', resize:'none', marginBottom:10, boxSizing:'border-box' }} />
          <label style={{ display:'block', border:'2px dashed var(--pf-border-md)', borderRadius:12, padding:'12px', textAlign:'center', cursor:'pointer', marginBottom:12, background:'var(--pf-surface)', fontSize:13, color: file ? 'var(--pf-ink)' : 'var(--pf-muted)' }}>
            {file ? `✓ ${file.name}` : 'Adjuntar archivo (opcional)'}
            <input type="file" style={{ display:'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => setShowNote(false)}
              style={{ flex:1, border:'none', borderRadius:12, padding:13, background:'var(--pf-surface)', color:'var(--pf-muted)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              style={{ flex:2, border:'none', borderRadius:12, padding:13, background:'var(--pf-coral)', color:'var(--pf-white)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: saving ? .6 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {records.length === 0
        ? <div className="empty-box">
            <ClipboardList size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
            <p style={{ fontSize:14, color:'var(--pf-muted)', margin:0 }}>Sin consultas registradas</p>
          </div>
        : records.map((r) => (
          <div key={r.id} className="rec-card">
            <div className="rec-top">
              <span className="rec-date">{new Date(r.visit_date).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</span>
              {r.profiles && <span className="rec-vet">Dr/a. {r.profiles.full_name?.split(' ')[0]}</span>}
            </div>
            <p className="rec-reason">{r.reason}</p>
            {r.diagnosis && <p className="rec-detail">Diagnóstico: {r.diagnosis}</p>}
            {r.treatment && <p className="rec-detail">Tratamiento: {r.treatment}</p>}
            {r.next_visit && (
              <p className="rec-next">
                <Calendar size={12} strokeWidth={2} />
                Próxima: {new Date(r.next_visit).toLocaleDateString('es-ES', { day:'numeric', month:'long' })}
              </p>
            )}
          </div>
        ))
      }
    </>
  )
}

const DOC_CFG: Record<string, { Icon: LucideIcon; label: string; color: string; bg: string }> = {
  prescription: { Icon: Pill,       label: 'Receta',  color: 'var(--pf-info-fg)',  bg: 'var(--pf-info)'    },
  exam:         { Icon: Microscope, label: 'Examen',  color: '#2563eb',             bg: '#eff6ff'            },
  photo:        { Icon: Camera,     label: 'Foto',    color: '#16a34a',              bg: '#f0fdf4'            },
  video:        { Icon: Video,      label: 'Vídeo',   color: '#dc2626',              bg: '#fef2f2'            },
  other:        { Icon: Paperclip,  label: 'Archivo', color: 'var(--pf-muted)',     bg: 'var(--pf-surface)' },
}

function DocCard({ doc }: { doc: PetFile }) {
  const [opening, setOpening] = useState(false)
  const { Icon, label, color, bg } = DOC_CFG[doc.file_type] ?? DOC_CFG.other
  const open = async () => {
    setOpening(true)
    const res = await fetch(`/api/files/${doc.id}`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    setOpening(false)
  }
  return (
    <button onClick={open} disabled={opening} style={{
      background:'var(--pf-white)', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
      border:'none', width:'100%', textAlign:'left', cursor:'pointer', marginBottom:8, fontFamily:'inherit',
    }}>
      <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color }}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--pf-ink)', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.notes || doc.file_name}</p>
        <span style={{ fontSize:10, fontWeight:600, color, background:bg, padding:'2px 7px', borderRadius:6 }}>{label}</span>
      </div>
      <span style={{ color:'var(--pf-hint)', fontSize:20, flexShrink:0 }}>{opening ? '…' : '›'}</span>
    </button>
  )
}

function getAge(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return m < 12 ? `${m} meses` : `${Math.floor(m / 12)} años`
}

const APPT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: 'var(--pf-warning)', color: 'var(--pf-warning-fg)' },
  confirmed: { label: 'Confirmada', bg: 'var(--pf-success)', color: 'var(--pf-success-fg)' },
  cancelled: { label: 'Cancelada',  bg: 'var(--pf-danger)',  color: 'var(--pf-danger-fg)'  },
  completed: { label: 'Completada', bg: 'var(--pf-info)',    color: 'var(--pf-info-fg)'    },
}

function CitasTab({ petId, petName, clinicId, appointments }: {
  petId: string; petName: string; clinicId?: string; appointments: AppointmentSummary[]
}) {
  const upcoming = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const past     = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled')

  return (
    <>
      {/* Emergency / instant call panel */}
      <EmergencyCall petId={petId} petName={petName} clinicId={clinicId} />

      {/* Scheduled booking form */}
      {clinicId
        ? <BookAppointment petId={petId} petName={petName} clinicId={clinicId} />
        : <div className="empty-box">
            <Calendar size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
            <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: 0 }}>Sin clínica asignada</p>
          </div>
      }

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 2px 8px' }}>
            Próximas
          </p>
          {upcoming.map((a) => {
            const st = APPT_STATUS[a.status] ?? APPT_STATUS.pending
            const dateLabel = new Date(a.appointment_date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={a.id} style={{ background: 'var(--pf-white)', borderRadius: 16, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.is_virtual
                      ? <Video size={13} strokeWidth={2} style={{ color: '#6366f1' }} />
                      : <MapPin size={13} strokeWidth={2} style={{ color: 'var(--pf-coral)' }} />
                    }
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pf-ink)' }}>{dateLabel}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: '0 0 4px' }}>
                  {a.appointment_time.slice(0, 5)} · {a.is_virtual ? 'Videollamada' : 'Presencial'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--pf-ink)', margin: '0 0 10px', lineHeight: 1.5 }}>{a.reason}</p>
                {a.is_virtual && a.status === 'confirmed' && (
                  <VideoCallRoom
                    appointmentId={a.id}
                    petName={petName}
                    dateLabel={`${dateLabel} · ${a.appointment_time.slice(0, 5)}`}
                  />
                )}
                {a.status === 'pending' && a.is_virtual && (
                  <p style={{ fontSize: 11, color: '#6366f1', margin: 0 }}>
                    El enlace de videollamada estará disponible cuando la clínica confirme la cita.
                  </p>
                )}
                {a.notes && (
                  <p style={{ fontSize: 12, color: 'var(--pf-success-fg)', margin: '6px 0 0', fontStyle: 'italic' }}>
                    Nota del veterinario: {a.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pf-muted)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 2px 8px' }}>
            Historial de citas
          </p>
          {past.map((a) => {
            const st = APPT_STATUS[a.status] ?? APPT_STATUS.completed
            return (
              <div key={a.id} style={{ background: 'var(--pf-white)', borderRadius: 16, padding: '12px 16px', marginBottom: 8, opacity: 0.8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)' }}>
                    {new Date(a.appointment_date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: 0 }}>{a.reason}</p>
                {a.cancellation_reason && (
                  <p style={{ fontSize: 11, color: 'var(--pf-danger-fg)', margin: '4px 0 0' }}>Motivo: {a.cancellation_reason}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="empty-box">
          <Calendar size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
          <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: 0 }}>Sin citas registradas</p>
        </div>
      )}
    </>
  )
}

/* ── RecetasTab ── */

type Tip = { id: string; title: string; content: string }

const TIP_STYLES: { bg: string; color: string; border: string; Icon: LucideIcon }[] = [
  { bg: '#f0fdf4',              color: '#15803d',             border: '#bbf7d0',             Icon: Utensils   },
  { bg: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',     border: 'var(--pf-coral-mid)', Icon: Activity   },
  { bg: '#fffbeb',              color: '#d97706',             border: '#fde68a',             Icon: ShieldCheck },
  { bg: 'var(--pf-info)',       color: 'var(--pf-info-fg)',   border: '#c4b5fd',             Icon: Sparkles   },
]

function RecetasTab({ petId }: { petId: string }) {
  const [tips, setTips]       = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`/api/owner/pet-tips?pet_id=${petId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.tips) setTips(d.tips); else setError(d.error || 'Error al cargar consejos') })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [petId])

  if (loading) return (
    <>
      <style>{`@keyframes pf-pulse{0%,100%{opacity:1}50%{opacity:.45}}.tip-sk{border-radius:10px;animation:pf-pulse 1.6s ease-in-out infinite;background:var(--pf-border);}`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'var(--pf-info)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkles size={16} strokeWidth={2} style={{ color:'var(--pf-info-fg)' }} />
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--pf-ink)', margin:0 }}>Consejos personalizados</p>
          <p style={{ fontSize:11, color:'var(--pf-muted)', margin:0 }}>Generando con IA…</p>
        </div>
      </div>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background:'var(--pf-surface)', borderRadius:18, padding:16, marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div className="tip-sk" style={{ width:34, height:34, flexShrink:0 }} />
            <div className="tip-sk" style={{ height:14, width:120 }} />
          </div>
          <div className="tip-sk" style={{ height:12, width:'100%', marginBottom:6 }} />
          <div className="tip-sk" style={{ height:12, width:'75%' }} />
        </div>
      ))}
    </>
  )

  if (error) return (
    <div className="empty-box">
      <Sparkles size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
      <p style={{ fontSize:14, color:'var(--pf-muted)', margin:0 }}>{error}</p>
    </div>
  )

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'var(--pf-info)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkles size={16} strokeWidth={2} style={{ color:'var(--pf-info-fg)' }} />
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--pf-ink)', margin:0 }}>Consejos personalizados</p>
          <p style={{ fontSize:11, color:'var(--pf-muted)', margin:0 }}>Generados por IA a partir de su perfil</p>
        </div>
      </div>
      {tips.map((tip, i) => {
        const s = TIP_STYLES[i % TIP_STYLES.length]
        const { Icon } = s
        return (
          <div key={tip.id} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:18, padding:16, marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={17} strokeWidth={2} style={{ color:s.color }} />
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:s.color, margin:0 }}>{tip.title}</p>
            </div>
            <p style={{ fontSize:13, color:'var(--pf-ink)', lineHeight:1.6, margin:0 }}>{tip.content}</p>
          </div>
        )
      })}
    </>
  )
}
