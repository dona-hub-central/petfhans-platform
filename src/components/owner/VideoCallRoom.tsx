'use client'

import { useState } from 'react'
import { Video, X, ExternalLink, Star } from 'lucide-react'

function jitsiRoom(appointmentId: string) {
  return `petfhans-${appointmentId.replace(/-/g, '').slice(0, 16)}`
}

/* ── Post-call rating modal ── */
function RatingModal({
  appointmentId,
  petName,
  onDone,
}: {
  appointmentId: string
  petName: string
  onDone: () => void
}) {
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!stars) return
    setSubmitting(true)
    await fetch(`/api/appointments/${appointmentId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: stars, comment, is_anonymous: anonymous, rated_by: 'owner' }),
      credentials: 'include',
    }).catch(() => {})
    setDone(true)
    setTimeout(onDone, 1800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '28px 24px',
        maxWidth: 360, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0,0,0,.3)',
      }}>
        {done ? (
          <>
            <p style={{ fontSize: 42, margin: '0 0 12px' }}>🙌</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>¡Gracias por tu opinión!</p>
          </>
        ) : (
          <>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Video size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1c1c1e', margin: '0 0 4px' }}>
              ¿Cómo fue la videollamada?
            </p>
            <p style={{ fontSize: 13, color: '#8e8e93', margin: '0 0 20px' }}>
              Consulta virtual con el veterinario de {petName}
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <Star
                    size={32}
                    strokeWidth={1.5}
                    style={{
                      fill: n <= (hovered || stars) ? '#f59e0b' : 'none',
                      color: n <= (hovered || stars) ? '#f59e0b' : '#d1d5db',
                      transition: 'all .15s',
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Cuéntanos más (opcional)…"
              rows={2}
              style={{
                width: '100%', border: 'none', background: '#f2f2f7', borderRadius: 12,
                padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
                resize: 'none', boxSizing: 'border-box', marginBottom: 12,
              }}
            />

            {/* Anonymous toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setAnonymous(a => !a)}
                style={{
                  width: 38, height: 22, borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: anonymous ? '#EE726D' : '#d1d5db',
                  position: 'relative', flexShrink: 0, transition: 'background .2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 18, height: 18,
                  background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  transition: 'transform .2s',
                  transform: anonymous ? 'translateX(18px)' : 'translateX(2px)',
                }} />
              </button>
              <span style={{ fontSize: 13, color: '#3c3c43' }}>Calificar de forma anónima</span>
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onDone}
                style={{ flex: 1, border: 'none', borderRadius: 12, padding: '12px', background: '#f2f2f7', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Omitir
              </button>
              <button type="button" onClick={submit} disabled={!stars || submitting}
                style={{ flex: 2, border: 'none', borderRadius: 12, padding: '12px', background: '#EE726D', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!stars || submitting) ? .6 : 1 }}>
                {submitting ? 'Enviando…' : 'Enviar calificación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main component ── */
export default function VideoCallRoom({
  appointmentId,
  petName,
  dateLabel,
}: {
  appointmentId: string
  petName: string
  dateLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const room = jitsiRoom(appointmentId)
  const url = `https://meet.jit.si/${room}`

  const handleClose = () => {
    setOpen(false)
    setShowRating(true)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', border: 'none', borderRadius: 14, padding: '13px 16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Video size={16} strokeWidth={2.5} />
        Unirse a videollamada
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', background: '#1a1a2e', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Video size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  Consulta virtual · {petName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{dateLabel}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir en pestaña nueva"
                style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <ExternalLink size={14} />
              </a>
              <button onClick={handleClose} title="Cerrar y calificar"
                style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <iframe
            src={`${url}#config.startWithAudioMuted=true&config.prejoinPageEnabled=false&userInfo.displayName=Dueño de ${encodeURIComponent(petName)}`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={`Videollamada · ${petName}`}
          />
        </div>
      )}

      {showRating && (
        <RatingModal
          appointmentId={appointmentId}
          petName={petName}
          onDone={() => setShowRating(false)}
        />
      )}
    </>
  )
}

/** Compact join button for vet-side (opens new tab + shows rating prompt on return) */
export function VetVideoJoinButton({ appointmentId, petName }: { appointmentId: string; petName: string }) {
  const [showRating, setShowRating] = useState(false)
  const room = jitsiRoom(appointmentId)
  const url = `https://meet.jit.si/${room}`

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
    // After 2s assume they joined; show rating prompt on tab return
    const onFocus = () => { setShowRating(true); window.removeEventListener('focus', onFocus) }
    setTimeout(() => window.addEventListener('focus', onFocus), 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <Video size={12} strokeWidth={2.5} />
        Unirse
      </button>

      {showRating && (
        <RatingModal
          appointmentId={appointmentId}
          petName={petName}
          onDone={() => setShowRating(false)}
        />
      )}
    </>
  )
}
