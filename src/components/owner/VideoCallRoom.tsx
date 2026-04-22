'use client'

import { useState } from 'react'
import { Video, X, ExternalLink, Maximize2 } from 'lucide-react'

function jitsiRoom(appointmentId: string) {
  return `petfhans-${appointmentId.replace(/-/g, '').slice(0, 16)}`
}

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
  const room = jitsiRoom(appointmentId)
  const url = `https://meet.jit.si/${room}`

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
        <div
          style={{
            position: 'fixed', inset: 0, background: '#0a0a0a',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
          }}
        >
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
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                  {dateLabel}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir en pestaña nueva"
                style={{
                  width: 32, height: 32, border: 'none', borderRadius: 8,
                  background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => setOpen(false)}
                title="Cerrar"
                style={{
                  width: 32, height: 32, border: 'none', borderRadius: 8,
                  background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Jitsi iframe */}
          <iframe
            src={`${url}#config.startWithAudioMuted=true&config.prejoinPageEnabled=false&userInfo.displayName=Dueño de ${encodeURIComponent(petName)}`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={`Videollamada · ${petName}`}
          />
        </div>
      )}
    </>
  )
}

/** Compact join button for vet-side use (opens in new tab, no embed) */
export function VetVideoJoinButton({ appointmentId, petName }: { appointmentId: string; petName: string }) {
  const room = jitsiRoom(appointmentId)
  const url = `https://meet.jit.si/${room}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 8, border: 'none',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        color: '#fff', fontSize: 12, fontWeight: 700,
        textDecoration: 'none', cursor: 'pointer',
      }}
    >
      <Video size={12} strokeWidth={2.5} />
      Unirse
    </a>
  )
}

export function VideoRoomInfo({ appointmentId }: { appointmentId: string }) {
  const room = jitsiRoom(appointmentId)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: '#ede9fe', color: '#6d28d9',
      fontSize: 11, fontWeight: 700,
    }}>
      <Video size={11} strokeWidth={2.5} />
      <span>Videollamada · {room}</span>
      <Maximize2 size={10} />
    </div>
  )
}
