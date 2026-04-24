'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Video, Wifi, WifiOff, Clock, Calendar } from 'lucide-react'
import VideoCallRoom from '@/components/owner/VideoCallRoom'

type AvailableVet = {
  vet_id: string
  vet_name: string
  since: number
}

function VetAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 16,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function OnlineSince({ since }: { since: number }) {
  const [mins, setMins] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMins(Math.floor((Date.now() - since) / 60000))
    intervalRef.current = setInterval(() => {
      setMins(Math.floor((Date.now() - since) / 60000))
    }, 60000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [since])

  return (
    <span style={{ fontSize: 11, color: '#16a34a' }}>
      Disponible · {mins < 1 ? 'ahora mismo' : `hace ${mins} min`}
    </span>
  )
}

export default function EmergencyCall({
  petId,
  petName,
  clinicId,
}: {
  petId: string
  petName: string
  clinicId?: string
}) {
  const [vets, setVets]           = useState<AvailableVet[]>([])
  const [calling, setCalling]     = useState<string | null>(null) // vet_id being called
  const [apptId, setApptId]       = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [view, setView]           = useState<'emergency' | 'schedule'>('emergency')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!clinicId) return
    const supabase = createClient()

    const ch = supabase.channel(`clinic-available:${clinicId}`)
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<AvailableVet>()
      const available = Object.values(state)
        .flat()
        .filter(v => Boolean((v as Record<string, unknown>).vet_id))
        .map(v => {
          const p = v as unknown as AvailableVet
          return { vet_id: p.vet_id, vet_name: p.vet_name, since: p.since }
        })
      setVets(available)
    }).subscribe()

    channelRef.current = ch
    return () => { ch.unsubscribe() }
  }, [clinicId])

  const callVet = async (vet: AvailableVet) => {
    setCalling(vet.vet_id); setError('')
    const res = await fetch('/api/appointments/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_id: petId, vet_id: vet.vet_id }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al iniciar llamada'); setCalling(null); return }
    setApptId(data.appointment.id)
    setCalling(null)
  }

  // Once call is created, show the video room directly
  if (apptId) {
    return (
      <VideoCallRoom
        appointmentId={apptId}
        petName={petName}
        dateLabel="Llamada de emergencia · ahora"
      />
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 18, padding: '16px 18px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Video size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
              Llamada inmediata
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: 0 }}>
              Consulta con un veterinario disponible ahora
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setView('emergency')}
            style={{ flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
              background: view === 'emergency' ? '#ef4444' : 'transparent',
              color: view === 'emergency' ? '#fff' : 'rgba(255,255,255,.5)',
            }}>
            <Video size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Ahora mismo
          </button>
          <button onClick={() => setView('schedule')}
            style={{ flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
              background: view === 'schedule' ? 'rgba(255,255,255,.15)' : 'transparent',
              color: view === 'schedule' ? '#fff' : 'rgba(255,255,255,.5)',
            }}>
            <Calendar size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Programar
          </button>
        </div>
      </div>

      {view === 'schedule' ? (
        <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
          <Calendar size={28} style={{ color: '#EE726D', marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: '0 0 4px' }}>Programar cita</p>
          <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>Usa el formulario de solicitud de cita de abajo para elegir fecha, hora y veterinario.</p>
        </div>
      ) : (
        <>
          {/* Real-time vet list */}
          {!clinicId ? (
            <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
              <WifiOff size={24} style={{ color: '#d1d5db', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#8e8e93', margin: 0 }}>Sin clínica asignada</p>
            </div>
          ) : vets.length === 0 ? (
            <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
              <WifiOff size={28} style={{ color: '#d1d5db', marginBottom: 10 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3c3c43', margin: '0 0 4px' }}>
                Sin veterinarios disponibles
              </p>
              <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>
                Ningún veterinario está conectado en este momento. Programa una cita o inténtalo más tarde.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'blink 2s infinite' }} />
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Actualizando en tiempo real</span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 2px' }}>
                <Wifi size={12} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>
                  {vets.length} veterinario{vets.length !== 1 ? 's' : ''} disponible{vets.length !== 1 ? 's' : ''} ahora
                </span>
              </div>

              {vets.map((vet) => (
                <div key={vet.vet_id} style={{
                  background: '#fff', borderRadius: 16, padding: '14px 16px',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
                  border: '1.5px solid #e5f7eb',
                }}>
                  <VetAvatar name={vet.vet_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: '0 0 2px' }}>
                      Dr/a. {vet.vet_name}
                    </p>
                    <OnlineSince since={vet.since} />
                  </div>
                  <button
                    onClick={() => callVet(vet)}
                    disabled={!!calling}
                    style={{
                      border: 'none', borderRadius: 12, padding: '10px 16px',
                      background: calling === vet.vet_id
                        ? '#f0fdf4'
                        : 'linear-gradient(135deg,#22c55e,#16a34a)',
                      color: calling === vet.vet_id ? '#16a34a' : '#fff',
                      fontSize: 13, fontWeight: 700, cursor: calling ? 'default' : 'pointer',
                      fontFamily: 'inherit', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: calling && calling !== vet.vet_id ? .5 : 1,
                    }}
                  >
                    {calling === vet.vet_id
                      ? <><Clock size={13} /> Conectando…</>
                      : <><Video size={13} /> Llamar</>
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: '#dc2626', margin: '8px 2px 0', fontWeight: 600 }}>{error}</p>
          )}
        </>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: .3; }
        }
      `}</style>
    </div>
  )
}
