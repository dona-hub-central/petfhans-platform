'use client'

import { useEffect } from 'react'

type Pet = { id: string; name: string; photo_url: string | null; species: string }

export default function PetSelectorModal({
  pets,
  actionLabel,
  onSelect,
  onClose,
}: {
  pets: Pet[]
  actionLabel: string
  onSelect: (petId: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <>
      <div className="pf-pselect-bg" onClick={onClose} />

      <div className="pf-pselect-sheet" role="dialog" aria-modal="true" aria-label={actionLabel}>
        <div className="pf-pselect-handle" aria-hidden />

        <p className="pf-pselect-title">{actionLabel}</p>
        <p className="pf-pselect-sub">¿Para cuál mascota?</p>

        <div className="pf-pselect-list">
          {pets.map(pet => (
            <button
              key={pet.id}
              type="button"
              onClick={() => onSelect(pet.id)}
              className="pf-pselect-item"
            >
              <span className="pf-pselect-avatar">
                {pet.photo_url
                  ? <img src={pet.photo_url} alt={pet.name} />
                  : <span>{pet.name[0]?.toUpperCase()}</span>
                }
              </span>
              <span className="pf-pselect-name">{pet.name}</span>
              <span className="pf-pselect-chev" aria-hidden>›</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={onClose} className="pf-pselect-cancel">
          Cancelar
        </button>
      </div>

      <style>{`
        .pf-pselect-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          z-index: 200;
          animation: pselectFadeIn .15s;
        }
        .pf-pselect-sheet {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          background: var(--pf-white);
          border-radius: 22px 22px 0 0;
          padding: 14px 18px calc(env(safe-area-inset-bottom) + 18px);
          z-index: 201;
          max-width: 480px;
          margin: 0 auto;
          animation: pselectSlideUp .2s ease-out;
        }
        @media (min-width: 768px) {
          .pf-pselect-sheet {
            inset: auto; left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            border-radius: 22px;
            max-width: 420px; width: 90%;
            padding: 22px 22px 22px;
          }
        }
        .pf-pselect-handle {
          width: 38px; height: 4px;
          background: var(--pf-border);
          border-radius: 999px;
          margin: 4px auto 12px;
        }
        @media (min-width: 768px) { .pf-pselect-handle { display: none; } }
        .pf-pselect-title {
          font-family: var(--pf-font-display);
          font-size: 18px; font-weight: 700; color: var(--pf-ink);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .pf-pselect-sub {
          font-family: var(--pf-font-body);
          font-size: 13px; color: var(--pf-muted);
          margin: 0 0 14px;
        }
        .pf-pselect-list {
          display: flex; flex-direction: column; gap: 6px;
        }
        .pf-pselect-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          background: var(--pf-surface);
          border: 0.5px solid var(--pf-border);
          border-radius: 12px;
          cursor: pointer;
          font-family: var(--pf-font-body);
          text-align: left;
          transition: background .15s;
        }
        .pf-pselect-item:hover { background: var(--pf-coral-soft); }
        .pf-pselect-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--pf-coral-soft);
          color: var(--pf-coral);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
          font-family: var(--pf-font-display);
          font-size: 16px; font-weight: 700;
        }
        .pf-pselect-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pf-pselect-name {
          flex: 1; font-size: 14px; font-weight: 600;
          color: var(--pf-ink);
        }
        .pf-pselect-chev {
          font-size: 20px; color: var(--pf-hint);
        }
        .pf-pselect-cancel {
          margin-top: 10px; width: 100%;
          padding: 12px;
          background: transparent; border: none;
          font-family: var(--pf-font-body);
          font-size: 14px; color: var(--pf-muted);
          cursor: pointer;
          border-radius: 10px;
          transition: background .15s;
        }
        .pf-pselect-cancel:hover { background: var(--pf-surface); }
        @keyframes pselectFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pselectSlideUp {
          from { transform: translateY(100%) }
          to { transform: translateY(0) }
        }
        @media (min-width: 768px) {
          @keyframes pselectSlideUp {
            from { transform: translate(-50%, -40%); opacity: 0 }
            to { transform: translate(-50%, -50%); opacity: 1 }
          }
        }
      `}</style>
    </>
  )
}
