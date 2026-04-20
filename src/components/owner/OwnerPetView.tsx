'use client'

import { useState, useRef } from 'react'
import PetAvatar from '@/components/shared/PetAvatar'
import PetGallery from '@/components/owner/PetGallery'
import { createClient } from '@/lib/supabase/client'
import BookAppointment from '@/components/owner/BookAppointment'
import { PawPrint, Calendar, Camera, FileText, ClipboardList, type LucideIcon } from 'lucide-react'

type Tab = 'info' | 'galeria' | 'docs' | 'historial' | 'citas'

const TABS: { key: Tab; Icon: LucideIcon; label: string }[] = [
  { key: 'info',      Icon: PawPrint,      label: 'Ficha' },
  { key: 'citas',     Icon: Calendar,      label: 'Citas' },
  { key: 'galeria',   Icon: Camera,        label: 'Galería' },
  { key: 'docs',      Icon: FileText,      label: 'Docs' },
  { key: 'historial', Icon: ClipboardList, label: 'Historial' },
]

const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro'
}

export default function OwnerPetView({ pet, records, photos, docs, clinicName, clinicId }: {
  pet: any; records: any[]; photos: any[]; docs: any[]; clinicName: string; clinicId?: string
}) {
  const [tab, setTab] = useState<Tab>('info')
  const nextVisit = records.find(r => r.next_visit && new Date(r.next_visit) > new Date())

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:#f2f2f7; font-family:var(--pf-font-body); }

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
        .logout-hero-btn { border:1.5px solid rgba(255,255,255,.5); background:transparent; color:#fff; border-radius:20px; padding:5px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }

        .mob-tabs { display:flex; background:rgba(0,0,0,.15); }
        .mob-tab { flex:1; border:none; background:none; cursor:pointer; color:rgba(255,255,255,.55); padding:11px 6px 9px; font-size:11px; font-weight:600; font-family:inherit; border-bottom:2.5px solid transparent; transition:all .15s; display:flex; flex-direction:column; align-items:center; gap:2px; }
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
        .rec-next { font-size:12px; color:var(--pf-coral); font-weight:600; margin:8px 0 0; }

        /* ── DESKTOP (≥768px) ── */
        @media (min-width:768px) {
          html, body { background:#f5f5f7; }
          .pet-shell { min-height:100vh; flex-direction:column; max-width:1100px; margin:0 auto; padding:0 24px; }

          /* Header desktop */
          .hero { background:none; border-radius:0; flex-shrink:0; }
          .hero-nav { padding:28px 0 0; }
          .back-link { color:var(--pf-coral); font-size:14px; }
          .hero-body { padding:20px 0 0; align-items:center; gap:20px; }
          .hero-info { padding-bottom:0; }
          .pet-name { color:var(--pf-ink); font-size:32px; }
          .pet-sub  { color:var(--pf-muted); }
          .next-badge { background:var(--pf-coral-soft); color:var(--pf-coral); }

          /* Logout en desktop */
          .logout-hero-btn { border:1.5px solid rgba(238,114,109,.4); color:var(--pf-coral); }

          /* Tabs como pills horizontales */
          .mob-tabs { background:none; border-bottom:0.5px solid var(--pf-border); margin-top:24px; gap:0; }
          .mob-tab { flex:none; padding:10px 20px 10px; color:var(--pf-muted); border-bottom:2.5px solid transparent; border-radius:0; font-size:13px; flex-direction:row; gap:6px; }
          .mob-tab.active { color:var(--pf-coral); border-bottom-color:var(--pf-coral); }

          /* Layout 2 columnas en desktop */
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
          <div className="hero-nav" style={{ justifyContent:'space-between' }}>
            <a href="/owner/dashboard" className="back-link">‹ Mis mascotas</a>
            <button onClick={async () => { const s = createClient(); await s.auth.signOut(); window.location.href='/auth/login' }}
              className="logout-hero-btn">
              Cerrar sesión
            </button>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {new Date(nextVisit.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mob-tabs">
            {TABS.map(({ key, Icon, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`mob-tab${tab===key?' active':''}`}>
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
                  <DataCard pet={pet} clinicName={clinicName} nextVisit={nextVisit} />
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
              {tab === 'citas'    && <>
            {clinicId
              ? <BookAppointment petId={pet.id} clinicId={clinicId} />
              : <div className="empty-box"><p style={{fontSize:32,margin:'0 0 8px'}}>📅</p><p style={{fontSize:14,color:'#8e8e93',margin:0}}>Sin clínica asignada</p></div>
            }
          </>}
          {tab === 'docs'     && <DocsTab petId={pet.id} initialDocs={docs} />}
              {tab === 'historial'&& <HistorialTab petId={pet.id} records={records} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sub-componentes ── */

function DataCard({ pet, clinicName }: any) {
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

function InfoDesktop({ pet, clinicName, nextVisit, records }: any) {
  return (
    <>
      {/* En mobile muestra todo junto, en desktop solo complementa */}
      <div style={{ display:'none' }} className="mobile-info-extra">
        <DataCard pet={pet} clinicName={clinicName} nextVisit={nextVisit} />
      </div>
      {pet.notes && (
        <div className="card">
          <p className="card-title">Notas</p>
          <p style={{ padding:'10px 16px 14px', fontSize:14, color:'#3c3c43', lineHeight:1.6, margin:0 }}>{pet.notes}</p>
        </div>
      )}
      {nextVisit && (
        <div className="card" style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12, background:'var(--pf-coral-soft)' }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pf-coral)', flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--pf-coral-dark)', fontWeight:700, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.07em' }}>Próxima visita</p>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--pf-ink)', margin:0 }}>
              {new Date(nextVisit.next_visit).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
        </div>
      )}
      {records.length > 0 && (
        <div className="card">
          <p className="card-title">Últimas consultas</p>
          {records.slice(0,3).map((r:any) => (
            <div key={r.id} style={{ padding:'10px 16px', borderTop:'1px solid #f2f2f7' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#1c1c1e', margin:0 }}>{r.reason}</p>
                <span style={{ fontSize:11, color:'#8e8e93' }}>{new Date(r.visit_date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</span>
              </div>
              {r.diagnosis && <p style={{ fontSize:12, color:'#8e8e93', margin:'2px 0 0' }}>Dx: {r.diagnosis}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function DocsTab({ petId, initialDocs }: { petId: string; initialDocs: any[] }) {
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
    } catch (err: any) { setError(err.message) }
    setUploading(false)
  }

  return (
    <>
      <button onClick={() => setShowForm(!showForm)} style={{
        width:'100%', border:'none', borderRadius:18, padding:'14px 16px',
        background:'#EE726D', color:'#fff', fontFamily:'inherit',
        fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:12,
      }}>+ Añadir documento</button>

      {showForm && (
        <form onSubmit={upload} style={{ background:'#fff', borderRadius:18, padding:18, marginBottom:12 }}>
          <p style={{ fontWeight:700, fontSize:15, color:'#1c1c1e', margin:'0 0 12px' }}>Nuevo documento</p>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {[['prescription','💊 Receta'],['exam','🔬 Examen'],['other','📎 Otro']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => setFileType(v)}
                style={{ flex:1, border:'none', borderRadius:12, padding:'10px 4px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  background: fileType===v ? '#fff0ef' : '#f2f2f7', color: fileType===v ? '#EE726D' : '#8e8e93',
                  outline: fileType===v ? '2px solid #EE726D' : 'none' }}>{l}</button>
            ))}
          </div>
          <input type="text" placeholder="Descripción (opcional)" value={notes} onChange={e => setNotes(e.target.value)}
            style={{ width:'100%', border:'none', background:'#f2f2f7', borderRadius:12, padding:'12px 14px', fontSize:14, fontFamily:'inherit', marginBottom:10, boxSizing:'border-box' }} />
          <div onClick={() => inputRef.current?.click()} style={{
            border:'2px dashed #d1d1d6', borderRadius:12, padding:'18px', textAlign:'center', cursor:'pointer', marginBottom:12, background:'#f9f9f9',
          }}>
            <p style={{ margin:0, fontSize:13, color: file ? '#1c1c1e' : '#8e8e93', fontWeight: file ? 600 : 400 }}>
              {file ? `✓ ${file.name}` : 'Toca para seleccionar archivo'}
            </p>
            <input ref={inputRef} type="file" style={{ display:'none' }} accept=".pdf,.doc,.docx,image/*"
              onChange={e => { setFile(e.target.files?.[0] || null); setError('') }} />
          </div>
          {error && <p style={{ color:'#dc2626', fontSize:13, margin:'0 0 10px' }}>{error}</p>}
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              style={{ flex:1, border:'none', borderRadius:12, padding:13, background:'#f2f2f7', color:'#8e8e93', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            <button type="submit" disabled={uploading}
              style={{ flex:2, border:'none', borderRadius:12, padding:13, background:'#EE726D', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: uploading ? .6 : 1 }}>
              {uploading ? 'Subiendo…' : 'Subir'}</button>
          </div>
        </form>
      )}

      {docs.length === 0 && !showForm
        ? <div className="empty-box"><p style={{ fontSize:36, margin:'0 0 8px' }}>📎</p><p style={{ fontSize:14, color:'#8e8e93', margin:0 }}>Sin documentos aún</p></div>
        : docs.map((d: any) => <DocCard key={d.id} doc={d} />)
      }
    </>
  )
}

function HistorialTab({ petId, records }: { petId: string; records: any[] }) {
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
        width:'100%', border:'2px solid #EE726D', borderRadius:18, padding:'13px 16px',
        background:'#fff', color:'#EE726D', fontFamily:'inherit', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:12,
      }}>+ Añadir observación</button>
      {ok && <p style={{ color:'#16a34a', fontSize:13, textAlign:'center', margin:'0 0 10px' }}>✓ Guardado</p>}
      {showNote && (
        <form onSubmit={submit} style={{ background:'#fff', borderRadius:18, padding:16, marginBottom:12 }}>
          <textarea placeholder="Escribe una observación sobre tu mascota…" value={note} onChange={e => setNote(e.target.value)} rows={3}
            style={{ width:'100%', border:'none', background:'#f2f2f7', borderRadius:12, padding:'12px 14px', fontSize:14, fontFamily:'inherit', resize:'none', marginBottom:10, boxSizing:'border-box' as any }} />
          <label style={{ display:'block', border:'2px dashed #d1d1d6', borderRadius:12, padding:'12px', textAlign:'center', cursor:'pointer', marginBottom:12, background:'#f9f9f9', fontSize:13, color: file ? '#1c1c1e' : '#8e8e93' }}>
            {file ? `✓ ${file.name}` : 'Adjuntar archivo (opcional)'}
            <input type="file" style={{ display:'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => setShowNote(false)}
              style={{ flex:1, border:'none', borderRadius:12, padding:13, background:'#f2f2f7', color:'#8e8e93', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              style={{ flex:2, border:'none', borderRadius:12, padding:13, background:'#EE726D', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: saving ? .6 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {records.length === 0
        ? <div className="empty-box"><p style={{ fontSize:36, margin:'0 0 8px' }}>📋</p><p style={{ fontSize:14, color:'#8e8e93', margin:0 }}>Sin consultas registradas</p></div>
        : records.map((r: any) => (
          <div key={r.id} className="rec-card">
            <div className="rec-top">
              <span className="rec-date">{new Date(r.visit_date).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</span>
              {r.profiles && <span className="rec-vet">Dr/a. {r.profiles.full_name?.split(' ')[0]}</span>}
            </div>
            <p className="rec-reason">{r.reason}</p>
            {r.diagnosis && <p className="rec-detail">Diagnóstico: {r.diagnosis}</p>}
            {r.treatment && <p className="rec-detail">Tratamiento: {r.treatment}</p>}
            {r.next_visit && <p className="rec-next">📅 Próxima: {new Date(r.next_visit).toLocaleDateString('es-ES', { day:'numeric', month:'long' })}</p>}
          </div>
        ))
      }
    </>
  )
}

function DocCard({ doc }: { doc: any }) {
  const [opening, setOpening] = useState(false)
  const cfg: Record<string, [string, string, string]> = {
    prescription:['💊','Receta','#7c3aed'], exam:['🔬','Examen','#2563eb'],
    photo:['📷','Foto','#16a34a'], video:['🎥','Vídeo','#dc2626'], other:['📎','Archivo','#64748b'],
  }
  const [icon, label, color] = cfg[doc.file_type] ?? cfg.other
  const open = async () => {
    setOpening(true)
    const res = await fetch(`/api/files/${doc.id}`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    setOpening(false)
  }
  return (
    <button onClick={open} disabled={opening} style={{
      background:'#fff', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
      border:'none', width:'100%', textAlign:'left', cursor:'pointer', marginBottom:8, fontFamily:'inherit',
    }}>
      <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#1c1c1e', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.notes || doc.file_name}</p>
        <span style={{ fontSize:10, fontWeight:600, color, background:color+'15', padding:'2px 7px', borderRadius:6 }}>{label}</span>
      </div>
      <span style={{ color:'#c7c7cc', fontSize:20, flexShrink:0 }}>{opening ? '⏳' : '›'}</span>
    </button>
  )
}

function getAge(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return m < 12 ? `${m} meses` : `${Math.floor(m / 12)} años`
}


