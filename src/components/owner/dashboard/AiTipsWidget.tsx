'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

type Tip = { id: string; title: string; content: string }
type Pet = { id: string; name: string }

export default function AiTipsWidget({ pet }: { pet: Pet | undefined }) {
  const [tips, setTips]       = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  const petId = pet?.id
  useEffect(() => {
    if (!petId) { setLoading(false); return }
    let cancelled = false
    setLoading(true); setError(false)
    fetch(`/api/owner/pet-tips?pet_id=${petId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then(data => {
        if (cancelled) return
        const list: Tip[] = Array.isArray(data?.tips) ? data.tips.slice(0, 3) : []
        setTips(list)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true); setLoading(false)
      })
    return () => { cancelled = true }
  }, [petId])

  if (!pet) return null

  return (
    <div className="pf-tips-card">
      <div className="pf-tips-head">
        <div className="pf-tips-head-l">
          <span className="pf-tips-icon"><Sparkles size={14} strokeWidth={2} /></span>
          <span className="pf-tips-label">Recetas para {pet.name}</span>
        </div>
        <Link href={`/owner/pets/${pet.id}?tab=recetas`} className="pf-tips-more">
          Ver todas →
        </Link>
      </div>

      {loading && (
        <div className="pf-tips-skel">
          {[0, 1, 2].map(i => (
            <div key={i} className="pf-tips-skel-row" style={{ width: i === 2 ? '60%' : '100%' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="pf-tips-empty">No se pudieron cargar las recetas ahora.</p>
      )}

      {!loading && !error && tips.length === 0 && (
        <p className="pf-tips-empty">Aún no hay recetas. Vuelve más tarde.</p>
      )}

      {!loading && !error && tips.length > 0 && (
        <ul className="pf-tips-list">
          {tips.map(tip => (
            <li key={tip.id} className="pf-tips-item">
              <span className="pf-tips-bullet">✦</span>
              <div>
                <p className="pf-tips-title">{tip.title}</p>
                <p className="pf-tips-content">{tip.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .pf-tips-card {
          background: var(--pf-white);
          border-radius: 20px;
          padding: 18px;
          border: 0.5px solid var(--pf-border);
          box-shadow: var(--pf-shadow-sm);
        }
        .pf-tips-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .pf-tips-head-l { display: flex; align-items: center; gap: 8px; }
        .pf-tips-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 8px;
          background: var(--pf-info);
          color: var(--pf-info-fg);
        }
        .pf-tips-label {
          font-family: var(--pf-font-body);
          font-size: 11px; font-weight: 700; color: var(--pf-muted);
          text-transform: uppercase; letter-spacing: .07em;
        }
        .pf-tips-more {
          font-family: var(--pf-font-body);
          font-size: 12px; font-weight: 700; color: var(--pf-coral);
          text-decoration: none;
        }
        .pf-tips-skel {
          display: flex; flex-direction: column; gap: 10px;
          padding: 4px 0;
        }
        .pf-tips-skel-row {
          height: 14px;
          background: var(--pf-surface);
          border-radius: 6px;
          animation: tipsPulse 1.4s ease-in-out infinite;
        }
        .pf-tips-empty {
          font-family: var(--pf-font-body);
          font-size: 13px; color: var(--pf-muted);
          text-align: center; padding: 12px 0;
          margin: 0;
        }
        .pf-tips-list {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .pf-tips-item {
          display: flex; gap: 10px; align-items: flex-start;
        }
        .pf-tips-bullet {
          color: var(--pf-info-fg);
          font-size: 14px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .pf-tips-title {
          font-family: var(--pf-font-body);
          font-size: 13px; font-weight: 700; color: var(--pf-ink);
          margin: 0 0 2px;
        }
        .pf-tips-content {
          font-family: var(--pf-font-body);
          font-size: 13px; color: var(--pf-muted);
          line-height: 1.5; margin: 0;
        }
        @keyframes tipsPulse {
          0%, 100% { opacity: 1 }
          50% { opacity: .55 }
        }
      `}</style>
    </div>
  )
}
