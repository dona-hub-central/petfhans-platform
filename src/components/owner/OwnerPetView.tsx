'use client'

import { useState, useRef } from 'react'
import PetAvatar from '@/components/shared/PetAvatar'
import PetGallery from '@/components/owner/PetGallery'

type Tab = 'info' | 'galeria' | 'docs' | 'historial'

const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro'
}

export default function OwnerPetView({ pet, records, photos, docs, clinicName }: {
  pet: any; records: any[]; photos: any[]; docs: any[]; clinicName: string
}) {
  const [tab, setTab] = useState<Tab>('info')

  const nextVisit = records.find(r => r.next_visit && new Date(r.next_visit) > new Date())

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#f5f5f7',
      fontFamily: "'Roboto', sans-serif",
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        background: 'var(--accent)',
        padding: 'env(safe-area-inset-top, 12px) 16px 0',
        flexShrink: 0,
      }}>
        {/* nav */}
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 12 }}>
          <a href="/owner/dashboard" style={{
            color: 'rgba(255,255,255,.85)', fontSize: 13, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0',
          }}>‹ Inicio</a>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, color: '#fff', marginRight: 40 }}>
            {pet.name}
          </span>
        </div>

        {/* Hero pet card */}
        <div style={{
          background: 'rgba(255,255,255,.15)',
          borderRadius: '16px 16px 0 0',
          padding: '16px 16px 0',
          display: 'flex', alignItems: 'flex-end', gap: 14,
        }}>
          <div style={{ marginBottom: -1 }}>
            <PetAvatar petId={pet.id} species={pet.species} photoUrl={pet.photo_url}
              size={72} editable={true} />
          </div>
          <div style={{ paddingBottom: 14, flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0, lineHeight: 1 }}>{pet.name}</p>
            <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, margin: '4px 0 0' }}>
              {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
              {pet.weight ? ` · ${pet.weight} kg` : ''}
            </p>
            {nextVisit && (
              <span style={{
                display: 'inline-block', marginTop: 6,
                background: 'rgba(255,255,255,.25)', color: '#fff',
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              }}>
                📅 {new Date(nextVisit.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,.12)',
          borderRadius: '0',
        }}>
          {([
            ['info',     '🐾', 'Ficha'],
            ['galeria',  '📷', 'Galería'],
            ['docs',     '📎', 'Docs'],
            ['historial','📋', 'Historial'],
          ] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              style={{
                flex: 1, border: 'none', background: 'none',
                color: tab === key ? '#fff' : 'rgba(255,255,255,.55)',
                padding: '10px 4px 10px',
                fontSize: 11, fontWeight: tab === key ? 700 : 500,
                cursor: 'pointer',
                borderBottom: tab === key ? '2px solid #fff' : '2px solid transparent',
                transition: 'all .15s',
              }}>
              <span style={{ display: 'block', fontSize: 16, marginBottom: 2 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLL CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        <div style={{ padding: '16px 14px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>

          {/* FICHA */}
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoCard title="Datos básicos" rows={[
                ['Especie',   speciesLabel[pet.species]],
                ['Raza',      pet.breed || '—'],
                ['Sexo',      pet.gender === 'male' ? '♂ Macho' : '♀ Hembra'],
                ['Edad',      pet.birth_date ? getAge(pet.birth_date) : '—'],
                ['Peso',      pet.weight ? `${pet.weight} kg` : '—'],
                ['Castrado/a',pet.neutered ? 'Sí ✓' : 'No'],
                ['Microchip', pet.microchip || '—'],
              ]} />
              {clinicName && (
                <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🏥</span>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase' }}>Clínica</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{clinicName}</p>
                  </div>
                </div>
              )}
              {pet.notes && (
                <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase' }}>Notas</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{pet.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* GALERÍA */}
          {tab === 'galeria' && (
            <PetGallery petId={pet.id} initialPhotos={photos} />
          )}

          {/* DOCS */}
          {tab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.length === 0
                ? <Empty icon="📎" text="Sin documentos aún" />
                : docs.map((d: any) => <DocCard key={d.id} doc={d} />)
              }
            </div>
          )}

          {/* HISTORIAL */}
          {tab === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {records.length === 0
                ? <Empty icon="📋" text="Sin consultas registradas" />
                : records.map((r: any) => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        background: 'var(--accent-s)', color: 'var(--accent)',
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      }}>
                        {new Date(r.visit_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {r.profiles && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Dr/a. {r.profiles.full_name?.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: '0 0 4px' }}>{r.reason}</p>
                    {r.diagnosis && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0' }}>Diagnóstico: {r.diagnosis}</p>}
                    {r.treatment && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0' }}>Tratamiento: {r.treatment}</p>}
                    {r.next_visit && (
                      <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 8, margin: '8px 0 0' }}>
                        📅 Próxima: {new Date(r.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      </p>
                    )}
                  </div>
                ))
              }
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '12px 16px 0', margin: 0, letterSpacing: .5 }}>{title}</p>
      {rows.map(([label, value], i) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px',
          borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
        }}>
          <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function DocCard({ doc }: { doc: any }) {
  const [opening, setOpening] = useState(false)
  const icons: Record<string, string> = { prescription: '💊', exam: '🔬', photo: '📷', video: '🎥', other: '📎' }
  const labels: Record<string, string> = { prescription: 'Receta', exam: 'Examen', photo: 'Foto', video: 'Vídeo', other: 'Archivo' }
  const colors: Record<string, string> = { prescription: '#7c3aed', exam: '#2563eb', photo: '#16a34a', video: '#dc2626', other: '#64748b' }
  const color = colors[doc.file_type] || '#64748b'

  const open = async () => {
    setOpening(true)
    const res = await fetch(`/api/files/${doc.id}`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    setOpening(false)
  }

  return (
    <button onClick={open} disabled={opening}
      style={{
        background: '#fff', borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
      }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {icons[doc.file_type] || '📎'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.notes || doc.file_name}
        </p>
        <span style={{
          fontSize: 10, fontWeight: 600, color, background: color + '15',
          padding: '2px 7px', borderRadius: 6,
        }}>
          {labels[doc.file_type] || 'Archivo'}
        </span>
      </div>
      <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>
        {opening ? '⏳' : '›'}
      </span>
    </button>
  )
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 16 }}>
      <p style={{ fontSize: 36, margin: '0 0 8px' }}>{icon}</p>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{text}</p>
    </div>
  )
}

function getAge(birthDate: string) {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
