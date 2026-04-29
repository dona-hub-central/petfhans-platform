'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type DashboardPet = {
  id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight: number | null
  photo_url: string | null
  gender: string | null
  neutered: boolean | null
}

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now   = new Date()
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (totalMonths < 1) return 'Recién nacido'
  if (totalMonths < 12) return `${totalMonths} meses`
  const years  = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (months === 0) return `${years} año${years > 1 ? 's' : ''}`
  return `${years} año${years > 1 ? 's' : ''}, ${months} m`
}

function profileCompleteness(pet: DashboardPet): number {
  const fields = [pet.breed, pet.birth_date, pet.weight, pet.photo_url, pet.gender]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

export default function PetSummaryWidget({
  pets,
  appointmentCount,
  selectedId,
  onSelect,
}: {
  pets: DashboardPet[]
  appointmentCount: number
  selectedId?: string
  onSelect?: (id: string) => void
}) {
  const [internalId, setInternalId] = useState(pets[0]?.id ?? '')
  const activeId = selectedId ?? internalId
  const selected = pets.find(p => p.id === activeId) ?? pets[0]

  if (!selected) {
    return (
      <div className="pf-summary-card pf-summary-empty">
        <p style={{ fontFamily: 'var(--pf-font-display)', fontSize: 17, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
          Aún no tienes mascotas
        </p>
        <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 14px' }}>
          Registra a tu compañero para usar el dashboard
        </p>
        <Link href="/owner/pets/new" className="pf-summary-cta">
          Añadir mascota
        </Link>

        <style>{`
          .pf-summary-card {
            background: var(--pf-white);
            border-radius: 18px;
            padding: 20px;
            border: 0.5px solid var(--pf-border);
            box-shadow: var(--pf-shadow-sm);
          }
          .pf-summary-empty { text-align: center; padding: 40px 20px; }
          .pf-summary-cta {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 10px 20px; border-radius: 12px;
            background: var(--pf-coral); color: #fff;
            text-decoration: none; font-size: 14px; font-weight: 700;
            font-family: var(--pf-font-body);
          }
        `}</style>
      </div>
    )
  }

  const completeness = profileCompleteness(selected)
  const completeColor = completeness >= 80 ? '#22c55e' : '#f59e0b'

  const handleChange = (id: string) => {
    setInternalId(id)
    onSelect?.(id)
  }

  return (
    <div className="pf-summary-card">
      <div className="pf-summary-head">
        <span className="pf-summary-label">Mi mascota</span>
        {pets.length > 1 && (
          <select
            className="pf-summary-select"
            value={activeId}
            onChange={e => handleChange(e.target.value)}
            aria-label="Seleccionar mascota"
          >
            {pets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="pf-summary-main">
        <div className="pf-summary-avatar">
          {selected.photo_url
            ? <img src={selected.photo_url} alt={selected.name} />
            : <span>{selected.name[0]?.toUpperCase()}</span>
          }
        </div>

        <div className="pf-summary-info">
          <p className="pf-summary-name">{selected.name}</p>
          <p className="pf-summary-sub">
            {SPECIES_LABEL[selected.species] ?? selected.species}
            {selected.breed ? ` · ${selected.breed}` : ''}
          </p>

          <div className="pf-summary-pills">
            <div className="pf-summary-pill">
              <span className="pf-summary-pill-label">Edad</span>
              <span className="pf-summary-pill-value">{calcAge(selected.birth_date)}</span>
            </div>
            <div className="pf-summary-pill">
              <span className="pf-summary-pill-label">Peso</span>
              <span className="pf-summary-pill-value">{selected.weight ? `${selected.weight} kg` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pf-summary-stats">
        <div className="pf-summary-stat">
          <p className="pf-summary-stat-value">{pets.length}</p>
          <p className="pf-summary-stat-label">Mascotas</p>
        </div>
        <div className="pf-summary-stat">
          <p className="pf-summary-stat-value">{appointmentCount}</p>
          <p className="pf-summary-stat-label">Citas activas</p>
        </div>
        <div className="pf-summary-stat">
          <p className="pf-summary-stat-value" style={{ color: completeColor }}>
            {completeness}%
          </p>
          <p className="pf-summary-stat-label">Perfil</p>
        </div>
      </div>

      {completeness < 80 && (
        <p className="pf-summary-warn">
          <span style={{ color: completeColor, fontSize: 18, lineHeight: 1 }}>●</span>
          <span>Completa el perfil para mejores recomendaciones</span>
        </p>
      )}

      <Link href={`/owner/pets/${selected.id}`} className="pf-summary-cta">
        Ver perfil completo
        <ChevronRight size={16} strokeWidth={2.5} />
      </Link>

      <style>{`
        .pf-summary-card {
          background: var(--pf-white);
          border-radius: 20px;
          padding: 18px;
          border: 0.5px solid var(--pf-border);
          box-shadow: var(--pf-shadow-sm);
        }
        .pf-summary-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .pf-summary-label {
          font-family: var(--pf-font-body);
          font-size: 11px; font-weight: 700; color: var(--pf-muted);
          text-transform: uppercase; letter-spacing: .07em;
        }
        .pf-summary-select {
          font-family: var(--pf-font-body);
          font-size: 13px; font-weight: 600; color: var(--pf-ink);
          background: var(--pf-surface);
          border: 0.5px solid var(--pf-border);
          border-radius: 10px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .pf-summary-main {
          display: flex; gap: 14px; align-items: flex-start;
        }
        .pf-summary-avatar {
          width: 76px; height: 76px; border-radius: 18px;
          overflow: hidden;
          background: var(--pf-coral-soft);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--pf-font-display);
          font-size: 32px; font-weight: 700;
          color: var(--pf-coral);
        }
        .pf-summary-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pf-summary-info { flex: 1; min-width: 0; }
        .pf-summary-name {
          font-family: var(--pf-font-display);
          font-size: 22px; font-weight: 700; color: var(--pf-ink);
          margin: 0 0 2px;
          letter-spacing: -0.01em;
        }
        .pf-summary-sub {
          font-family: var(--pf-font-body);
          font-size: 13px; color: var(--pf-muted);
          margin: 0;
        }
        .pf-summary-pills {
          display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;
        }
        .pf-summary-pill {
          background: var(--pf-surface);
          border-radius: 10px;
          padding: 5px 10px;
        }
        .pf-summary-pill-label {
          font-family: var(--pf-font-body);
          font-size: 11px; color: var(--pf-muted);
          margin-right: 4px;
        }
        .pf-summary-pill-value {
          font-family: var(--pf-font-body);
          font-size: 13px; font-weight: 700; color: var(--pf-ink);
        }
        .pf-summary-stats {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 0.5px solid var(--pf-border);
        }
        .pf-summary-stat { text-align: center; }
        .pf-summary-stat-value {
          font-family: var(--pf-font-display);
          font-size: 22px; font-weight: 700; color: var(--pf-coral);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .pf-summary-stat-label {
          font-family: var(--pf-font-body);
          font-size: 11px; color: var(--pf-muted);
          margin: 2px 0 0;
        }
        .pf-summary-warn {
          margin: 12px 0 0;
          padding: 10px 12px;
          background: #fff8e6;
          border-radius: 10px;
          font-family: var(--pf-font-body);
          font-size: 12px; color: #92400e;
          display: flex; align-items: center; gap: 8px;
        }
        .pf-summary-cta {
          margin-top: 14px;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          padding: 12px;
          background: var(--pf-coral); color: #fff;
          border-radius: 12px;
          text-decoration: none;
          font-family: var(--pf-font-body);
          font-size: 14px; font-weight: 700;
          transition: background .15s;
        }
        .pf-summary-cta:hover { background: var(--pf-coral-dark); }
      `}</style>
    </div>
  )
}
