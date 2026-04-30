'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PetAvatar from '@/components/shared/PetAvatar'
import PetGallery from '@/components/owner/PetGallery'
import BookAppointment from '@/components/owner/BookAppointment'
import { PawPrint, Calendar, Camera, FileText, ClipboardList, Video, MapPin, Sparkles, Pill, Microscope, Paperclip, Utensils, Activity, ShieldCheck, BookOpen, Shield, Stethoscope, File, Upload, ChevronLeft, Star, Clock, FolderOpen, type LucideIcon } from 'lucide-react'
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
  { key: 'recetas',   Icon: Sparkles,      label: 'Recetas' },
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const validTabs: Tab[] = ['info', 'galeria', 'docs', 'historial', 'citas', 'recetas']
  const initialTab = (() => {
    const t = searchParams.get('tab') as Tab | null
    return t && validTabs.includes(t) ? t : 'info'
  })()
  const [tab, setTab] = useState<Tab>(initialTab)
  const nextVisit = records.find(r => r.next_visit && new Date(r.next_visit) > new Date())

  // Edit state for the Ficha tab
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState<{
    name: string; breed: string; birth_date: string; weight: string
    gender: string; neutered: boolean; microchip: string; notes: string
  }>({
    name:       pet.name       ?? '',
    breed:      pet.breed      ?? '',
    birth_date: pet.birth_date ?? '',
    weight:     pet.weight != null ? String(pet.weight) : '',
    gender:     pet.gender     ?? '',
    neutered:   pet.neutered   ?? false,
    microchip:  pet.microchip  ?? '',
    notes:      pet.notes      ?? '',
  })

  async function handleSave() {
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch(`/api/owner/pets/${pet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name       || undefined,
          breed:      form.breed      || null,
          birth_date: form.birth_date || null,
          weight:     form.weight ? parseFloat(form.weight) : null,
          gender:     (form.gender as 'male' | 'female' | 'unknown') || null,
          neutered:   form.neutered,
          microchip:  form.microchip  || null,
          notes:      form.notes      || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Error al guardar')
      } else {
        setEditing(false)
        router.refresh()
      }
    } catch {
      setSaveError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

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

        /* Edit form */
        .pf-pet-edit-btn { padding:8px 16px; border-radius:10px; border:0.5px solid var(--pf-border); background:var(--pf-surface); font-family:var(--pf-font-body); font-size:13px; font-weight:600; color:var(--pf-ink); cursor:pointer; transition:background .15s, color .15s; }
        .pf-pet-edit-btn:hover { background:var(--pf-coral-soft); color:var(--pf-coral); }
        .pf-pet-form { display:flex; flex-direction:column; gap:14px; }
        .pf-pet-form-title { font-family:var(--pf-font-display); font-size:17px; font-weight:700; color:var(--pf-ink); margin:0; }
        .pf-pet-label { display:flex; flex-direction:column; gap:6px; font-family:var(--pf-font-body); font-size:11px; font-weight:700; color:var(--pf-muted); text-transform:uppercase; letter-spacing:.05em; }
        .pf-pet-input { padding:10px 12px; border-radius:10px; border:0.5px solid var(--pf-border-md); background:var(--pf-white); font-family:var(--pf-font-body); font-size:14px; color:var(--pf-ink); outline:none; transition:border-color .15s; width:100%; box-sizing:border-box; }
        .pf-pet-input:focus { border-color:var(--pf-coral); }
        .pf-pet-textarea { min-height:80px; resize:vertical; }
        .pf-pet-actions { display:flex; gap:10px; justify-content:flex-end; padding-top:4px; }
        .pf-pet-cancel { padding:10px 18px; border-radius:10px; border:0.5px solid var(--pf-border); background:transparent; font-family:var(--pf-font-body); font-size:14px; font-weight:600; color:var(--pf-muted); cursor:pointer; }
        .pf-pet-save { padding:10px 18px; border-radius:10px; border:none; background:var(--pf-coral); color:#fff; font-family:var(--pf-font-body); font-size:14px; font-weight:700; cursor:pointer; transition:background .15s; }
        .pf-pet-save:hover:not(:disabled) { background:var(--pf-coral-dark); }
        .pf-pet-save:disabled, .pf-pet-cancel:disabled { opacity:.6; cursor:not-allowed; }

        /* Doc category grid */
        .doc-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .doc-cat-card { background:var(--pf-white); border:none; border-radius:18px; padding:18px 8px; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; font-family:inherit; transition:box-shadow .15s; text-align:center; }
        .doc-cat-card:hover { box-shadow:0 2px 12px rgba(0,0,0,.08); }
        .doc-cat-icon { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .doc-cat-name { font-size:12px; font-weight:700; color:var(--pf-ink); line-height:1.3; }
        .doc-cat-count { font-size:11px; color:var(--pf-muted); }

        /* Recipe cards */
        .recipe-card { background:var(--pf-white); border:none; border-radius:18px; padding:14px; display:flex; align-items:center; gap:12px; width:100%; text-align:left; cursor:pointer; font-family:inherit; margin-bottom:8px; transition:box-shadow .15s; }
        .recipe-card:hover { box-shadow:0 2px 12px rgba(0,0,0,.08); }
        .recipe-emoji { width:56px; height:56px; border-radius:14px; background:var(--pf-coral-soft); display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0; }
        .recipe-title { font-size:14px; font-weight:700; color:var(--pf-ink); margin:0 0 3px; line-height:1.3; }
        .recipe-sub { font-size:12px; color:var(--pf-muted); margin:0 0 6px; line-height:1.4; }
        .recipe-meta { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--pf-muted); font-weight:600; }

        /* Segmented control */
        .seg-ctrl { display:flex; background:var(--pf-surface); border-radius:12px; padding:3px; margin-bottom:14px; }
        .seg-btn { flex:1; border:none; border-radius:9px; padding:9px 8px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s,color .15s; }
        .seg-btn.active { background:var(--pf-white); color:var(--pf-ink); box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .seg-btn:not(.active) { background:transparent; color:var(--pf-muted); }

        /* Tip block */
        .tip-block { background:#FFF8E7; border-radius:14px; padding:14px 16px; margin-top:14px; }
        .tip-block-title { font-size:13px; font-weight:700; color:#B45309; margin:0 0 6px; display:flex; align-items:center; gap:6px; }
        .tip-block-body { font-size:13px; color:var(--pf-ink); line-height:1.6; margin:0; }

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
              {tab === 'info' && !editing && <InfoDesktop pet={pet} clinicName={clinicName} nextVisit={nextVisit} records={records} onEdit={() => setEditing(true)} />}
              {tab === 'info' && editing && (
                <div className="pf-pet-form">
                  <p className="pf-pet-form-title">Editar perfil de {pet.name}</p>
                  {saveError && <p style={{ color:'var(--pf-coral)', fontSize:13, margin:'0 0 8px' }}>{saveError}</p>}
                  {([
                    { key:'name',       label:'Nombre',              type:'text',   placeholder:'' },
                    { key:'breed',      label:'Raza',                type:'text',   placeholder:'Ej: Siamés' },
                    { key:'birth_date', label:'Fecha de nacimiento', type:'date',   placeholder:'' },
                    { key:'weight',     label:'Peso (kg)',           type:'number', placeholder:'Ej: 4.5' },
                    { key:'microchip',  label:'Microchip',           type:'text',   placeholder:'Número de microchip' },
                  ] as const).map(field => (
                    <label key={field.key} className="pf-pet-label">
                      {field.label}
                      <input
                        type={field.type}
                        step={field.type === 'number' ? '0.1' : undefined}
                        min={field.type === 'number' ? '0' : undefined}
                        className="pf-pet-input"
                        placeholder={field.placeholder}
                        value={form[field.key] as string}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      />
                    </label>
                  ))}
                  <label className="pf-pet-label">Sexo
                    <select className="pf-pet-input" value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">No especificado</option>
                      <option value="male">Macho</option>
                      <option value="female">Hembra</option>
                      <option value="unknown">Desconocido</option>
                    </select>
                  </label>
                  <label className="pf-pet-label">Castrado/a
                    <select className="pf-pet-input"
                      value={form.neutered ? 'true' : 'false'}
                      onChange={e => setForm(f => ({ ...f, neutered: e.target.value === 'true' }))}>
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </label>
                  <label className="pf-pet-label">Notas personales
                    <textarea className="pf-pet-input pf-pet-textarea"
                      placeholder="Alergias, comportamiento, preferencias..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </label>
                  <div className="pf-pet-actions">
                    <button onClick={() => { setEditing(false); setSaveError(null) }}
                      className="pf-pet-cancel" disabled={saving}>Cancelar</button>
                    <button onClick={handleSave} className="pf-pet-save" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}
              {tab === 'galeria'  && <PetGallery petId={pet.id} initialPhotos={photos} />}
              {tab === 'citas'    && <CitasTab petId={pet.id} petName={pet.name} clinicId={clinicId} appointments={appointments} />}
              {tab === 'docs'     && <DocsTab petId={pet.id} initialDocs={docs} />}
              {tab === 'historial'&& <HistorialTab petId={pet.id} records={records} />}
              {tab === 'recetas'  && <RecetasTab petId={pet.id} petName={pet.name} petSpecies={pet.species} />}
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

function InfoDesktop({ pet, clinicName, nextVisit, records, onEdit }: {
  pet: Pet
  clinicName: string
  nextVisit: RecordWithVet | undefined
  records: RecordWithVet[]
  onEdit: () => void
}) {
  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button onClick={onEdit} className="pf-pet-edit-btn">Editar perfil</button>
      </div>
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

const DOC_CATEGORIES: { key: string; label: string; Icon: LucideIcon; color: string; bg: string }[] = [
  { key: 'passport',               label: 'Pasaporte',            Icon: BookOpen,    color: '#EE726D', bg: '#FFF0EF' },
  { key: 'insurance',              label: 'Seguros',              Icon: Shield,      color: '#0d9488', bg: '#f0fdfa' },
  { key: 'health_booklet',         label: 'Cartilla sanitaria',   Icon: Stethoscope, color: '#1e40af', bg: '#eff6ff' },
  { key: 'medical_tests',          label: 'Pruebas médicas',      Icon: Microscope,  color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'vet_prescriptions',      label: 'Recetas veterinarias', Icon: Pill,        color: '#EE726D', bg: '#FFF0EF' },
  { key: 'uploaded_prescriptions', label: 'Recetas subidas',      Icon: Upload,      color: '#0d9488', bg: '#f0fdfa' },
  { key: 'other',                  label: 'Otros',                Icon: File,        color: '#1e40af', bg: '#eff6ff' },
]

type DocsView = 'grid' | 'category'

function DocsTab({ petId, initialDocs }: { petId: string; initialDocs: PetFile[] }) {
  const [docs, setDocs] = useState(initialDocs)
  const [view, setView] = useState<DocsView>('grid')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('other')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const openUpload = (preselect: string | null) => {
    setSelectedCategory(preselect ?? 'other')
    setFile(null); setNotes(''); setError('')
    setShowForm(true)
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file); fd.append('pet_id', petId)
    fd.append('file_type', 'other'); fd.append('notes', notes)
    fd.append('category', selectedCategory)
    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setUploading(false); return }
      setDocs(prev => [data.file, ...prev])
      setShowForm(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    setUploading(false)
  }

  const activeCatData = DOC_CATEGORIES.find(c => c.key === activeCategory)
  const categoryDocs = docs.filter(d => (d.category || 'other') === activeCategory)

  const UploadForm = (
    <form onSubmit={upload} style={{ background:'var(--pf-white)', borderRadius:18, padding:18, marginBottom:12 }}>
      <p style={{ fontWeight:700, fontSize:15, color:'var(--pf-ink)', margin:'0 0 12px' }}>Subir documento</p>
      <p style={{ fontSize:11, fontWeight:700, color:'var(--pf-muted)', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Categoría</p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {DOC_CATEGORIES.map(({ key, label, Icon, color, bg }) => (
          <button key={key} type="button" onClick={() => setSelectedCategory(key)}
            style={{ border:'none', borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
              background: selectedCategory === key ? bg : 'var(--pf-surface)',
              color:      selectedCategory === key ? color : 'var(--pf-muted)',
              outline:    selectedCategory === key ? `2px solid ${color}` : 'none' }}>
            <Icon size={13} strokeWidth={2} />{label}
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
          {uploading ? 'Subiendo…' : 'Subir'}
        </button>
      </div>
    </form>
  )

  /* ── Category detail view ── */
  if (view === 'category' && activeCatData) {
    const { Icon, color } = activeCatData
    return (
      <>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <button onClick={() => { setView('grid'); setActiveCategory(null); setShowForm(false) }}
            style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--pf-coral)', fontFamily:'inherit', fontWeight:600, fontSize:14, padding:0 }}>
            <ChevronLeft size={18} strokeWidth={2.5} />Volver
          </button>
          <button onClick={() => openUpload(activeCategory)}
            style={{ border:'none', borderRadius:12, padding:'8px 16px', background:'var(--pf-coral)', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Upload size={14} strokeWidth={2.5} />Subir
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:activeCatData.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={20} strokeWidth={1.75} style={{ color }} />
          </div>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--pf-ink)', margin:0, fontFamily:'var(--pf-font-display)' }}>
            {activeCatData.label}
          </p>
        </div>

        {showForm && UploadForm}

        {categoryDocs.length === 0 && !showForm
          ? <div style={{ border:'1.5px dashed var(--pf-border-md)', borderRadius:18, padding:'48px 24px', textAlign:'center' }}>
              <FolderOpen size={32} strokeWidth={1.25} style={{ color:'var(--pf-muted)', marginBottom:10 }} />
              <p style={{ fontSize:14, color:'var(--pf-muted)', margin:0 }}>No hay documentos en {activeCatData.label}</p>
            </div>
          : categoryDocs.map(d => <DocCard key={d.id} doc={d} catColor={color} catBg={activeCatData.bg} />)
        }
      </>
    )
  }

  /* ── Category grid view ── */
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <p style={{ fontSize:16, fontWeight:700, color:'var(--pf-ink)', margin:0, fontFamily:'var(--pf-font-display)' }}>Documentos</p>
        <button onClick={() => openUpload(null)}
          style={{ border:'none', borderRadius:12, padding:'8px 16px', background:'var(--pf-coral)', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Upload size={14} strokeWidth={2.5} />Subir
        </button>
      </div>

      {showForm && UploadForm}

      <div className="doc-grid">
        {DOC_CATEGORIES.map(({ key, label, Icon, color, bg }) => {
          const count = docs.filter(d => (d.category || 'other') === key).length
          return (
            <button key={key} className="doc-cat-card"
              onClick={() => { setActiveCategory(key); setView('category'); setShowForm(false) }}>
              <div className="doc-cat-icon" style={{ background: bg }}>
                <Icon size={24} strokeWidth={1.75} style={{ color }} />
              </div>
              <span className="doc-cat-name">{label}</span>
              <span className="doc-cat-count">{count} {count === 1 ? 'archivo' : 'archivos'}</span>
            </button>
          )
        })}
      </div>
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

function DocCard({ doc, catColor, catBg }: { doc: PetFile; catColor?: string; catBg?: string }) {
  const [opening, setOpening] = useState(false)
  const catCfg = DOC_CATEGORIES.find(c => c.key === (doc.category || 'other')) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1]
  const color = catColor ?? catCfg.color
  const bg    = catBg    ?? catCfg.bg
  const { Icon } = catCfg
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
        <span style={{ fontSize:10, fontWeight:600, color, background:bg, padding:'2px 7px', borderRadius:6 }}>{catCfg.label}</span>
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
      <div style={{ marginBottom: 24 }}>
        <EmergencyCall petId={petId} petName={petName} clinicId={clinicId} />
      </div>

      {/* Section label before scheduled appointments */}
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'var(--pf-muted)',
        textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 2px 10px',
      }}>
        Mis citas
      </p>

      {/* Scheduled booking form */}
      {clinicId
        ? <BookAppointment petId={petId} petName={petName} clinicId={clinicId} />
        : <div className="empty-box">
            <Calendar size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 4px' }}>
              Aún no tienes una clínica
            </p>
            <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 14px' }}>
              Busca una clínica en el marketplace para poder pedir citas
            </p>
            <a href="/marketplace/clinicas"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'var(--pf-coral)', color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}>
              Buscar clínica →
            </a>
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

type PetRecipe = {
  id: string
  title: string
  subtitle: string
  type: 'comida_natural' | 'snack'
  prep_time: number
  rating: number
  emoji: string
  ingredients: string[]
  preparation: string[]
  nutritional_tip: string
}

const SPECIES_LABELS: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Mascota' }

function RecipeDetail({ recipe, onBack }: { recipe: PetRecipe; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'preparation'>('ingredients')
  return (
    <>
      <button onClick={onBack}
        style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--pf-coral)', fontFamily:'inherit', fontWeight:600, fontSize:14, padding:'0 0 16px', marginLeft:-2 }}>
        <ChevronLeft size={18} strokeWidth={2.5} />Volver
      </button>

      {/* Header */}
      <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:20 }}>
        <div style={{ width:72, height:72, borderRadius:18, background:'var(--pf-coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0 }}>
          {recipe.emoji}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:17, fontWeight:800, color:'var(--pf-ink)', margin:'0 0 4px', fontFamily:'var(--pf-font-display)', lineHeight:1.25 }}>{recipe.title}</p>
          <p style={{ fontSize:13, color:'var(--pf-muted)', margin:'0 0 8px', lineHeight:1.4 }}>{recipe.subtitle}</p>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--pf-muted)', fontWeight:600 }}>
              <Clock size={13} strokeWidth={2} />{recipe.prep_time} min
            </span>
            <span style={{ display:'flex', gap:1 }}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={13} strokeWidth={0} fill={s <= recipe.rating ? '#FBBF24' : '#E5E7EB'} />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="seg-ctrl" style={{ marginBottom:14 }}>
        <button className={`seg-btn${activeTab === 'ingredients' ? ' active' : ''}`}
          onClick={() => setActiveTab('ingredients')}>Ingredientes</button>
        <button className={`seg-btn${activeTab === 'preparation' ? ' active' : ''}`}
          onClick={() => setActiveTab('preparation')}>Preparación</button>
      </div>

      <div style={{ background:'var(--pf-white)', borderRadius:16, padding:'14px 16px', marginBottom:4 }}>
        {activeTab === 'ingredients'
          ? recipe.ingredients.map((ing, i) => (
              <div key={i} style={{ display:'flex', gap:10, paddingBottom:10, marginBottom: i < recipe.ingredients.length - 1 ? 10 : 0, borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--pf-bg)' : 'none' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--pf-coral)', flexShrink:0, marginTop:5 }} />
                <p style={{ fontSize:14, color:'var(--pf-ink)', margin:0, lineHeight:1.5 }}>{ing}</p>
              </div>
            ))
          : recipe.preparation.map((step, i) => (
              <div key={i} style={{ display:'flex', gap:12, paddingBottom:12, marginBottom: i < recipe.preparation.length - 1 ? 12 : 0, borderBottom: i < recipe.preparation.length - 1 ? '1px solid var(--pf-bg)' : 'none' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--pf-coral-soft)', color:'var(--pf-coral)', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {i + 1}
                </span>
                <p style={{ fontSize:14, color:'var(--pf-ink)', margin:0, lineHeight:1.5 }}>{step}</p>
              </div>
            ))
        }
      </div>

      {/* Nutritional tip */}
      <div className="tip-block">
        <p className="tip-block-title">💡 Consejo nutricional</p>
        <p className="tip-block-body">{recipe.nutritional_tip}</p>
      </div>
    </>
  )
}

function RecetasTab({ petId, petName, petSpecies }: { petId: string; petName: string; petSpecies: string }) {
  const [recipes, setRecipes]       = useState<PetRecipe[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [activeType, setActiveType] = useState<'comida_natural' | 'snack'>('comida_natural')
  const [selected, setSelected]     = useState<PetRecipe | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`/api/owner/pet-recipes?pet_id=${petId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.recipes) setRecipes(d.recipes); else setError(d.error || 'Error al cargar recetas') })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [petId, refreshKey])

  if (selected) return <RecipeDetail recipe={selected} onBack={() => setSelected(null)} />

  const speciesLabel = SPECIES_LABELS[petSpecies] ?? 'Mascota'
  const filtered = recipes.filter(r => r.type === activeType)

  /* Loading skeleton */
  if (loading) return (
    <>
      <style>{`@keyframes pf-pulse{0%,100%{opacity:1}50%{opacity:.45}}.tip-sk{border-radius:10px;animation:pf-pulse 1.6s ease-in-out infinite;background:var(--pf-border);}`}</style>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div className="tip-sk" style={{ height:20, width:180, marginBottom:8 }} />
          <div className="tip-sk" style={{ height:13, width:220 }} />
        </div>
      </div>
      <div className="seg-ctrl" style={{ marginBottom:14 }}>
        <button className="seg-btn active">🍲 Comida natural</button>
        <button className="seg-btn">🍖 Snacks caseros</button>
      </div>
      {[0,1,2].map(i => (
        <div key={i} style={{ background:'var(--pf-white)', borderRadius:18, padding:14, marginBottom:8, display:'flex', gap:12 }}>
          <div className="tip-sk" style={{ width:56, height:56, borderRadius:14, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div className="tip-sk" style={{ height:14, width:'70%', marginBottom:8 }} />
            <div className="tip-sk" style={{ height:12, width:'90%', marginBottom:6 }} />
            <div className="tip-sk" style={{ height:11, width:60 }} />
          </div>
        </div>
      ))}
    </>
  )

  if (error) return (
    <div className="empty-box">
      <Sparkles size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
      <p style={{ fontSize:14, color:'var(--pf-muted)', margin:'0 0 12px' }}>{error}</p>
      <button onClick={() => setRefreshKey(k => k + 1)}
        style={{ border:'none', borderRadius:10, padding:'8px 16px', background:'var(--pf-coral)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
        Reintentar
      </button>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <p style={{ fontSize:17, fontWeight:800, color:'var(--pf-ink)', margin:'0 0 3px', fontFamily:'var(--pf-font-display)' }}>
            Recetas para {speciesLabel}
          </p>
          <p style={{ fontSize:12, color:'var(--pf-muted)', margin:0 }}>
            Personalizadas para {petName}
          </p>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          style={{ border:'0.5px solid var(--pf-border-md)', borderRadius:10, padding:'7px 13px', background:'var(--pf-white)', color:'var(--pf-ink)', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <Sparkles size={13} strokeWidth={2} style={{ color:'var(--pf-info-fg)' }} />Generar nuevas
        </button>
      </div>

      {/* Segmented control */}
      <div className="seg-ctrl">
        <button className={`seg-btn${activeType === 'comida_natural' ? ' active' : ''}`}
          onClick={() => setActiveType('comida_natural')}>🍲 Comida natural</button>
        <button className={`seg-btn${activeType === 'snack' ? ' active' : ''}`}
          onClick={() => setActiveType('snack')}>🍖 Snacks caseros</button>
      </div>

      {/* Recipe list */}
      {filtered.length === 0
        ? <div className="empty-box">
            <Utensils size={28} strokeWidth={1.5} style={{ color:'var(--pf-muted)', marginBottom:8 }} />
            <p style={{ fontSize:14, color:'var(--pf-muted)', margin:0 }}>No hay recetas en esta categoría</p>
          </div>
        : filtered.map(r => (
            <button key={r.id} className="recipe-card" onClick={() => setSelected(r)}>
              <div className="recipe-emoji">{r.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p className="recipe-title">{r.title}</p>
                <p className="recipe-sub">{r.subtitle}</p>
                <span className="recipe-meta">
                  <Clock size={12} strokeWidth={2} />{r.prep_time} min
                </span>
              </div>
              <ChevronLeft size={18} strokeWidth={2} style={{ color:'var(--pf-hint)', transform:'rotate(180deg)', flexShrink:0 }} />
            </button>
          ))
      }
    </>
  )
}
