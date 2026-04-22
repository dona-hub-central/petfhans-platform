'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Video, PhoneCall, X } from 'lucide-react'

type Profile = { id: string; clinic_id: string; full_name: string }

type IncomingCall = {
  appointment_id: string
  pet_name: string
  owner_name: string
  reason: string
}

function jitsiRoom(id: string) {
  return `petfhans-${id.replace(/-/g, '').slice(0, 16)}`
}

export default function AvailabilityToggle() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [available, setAvailable] = useState(false)
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)
  const presenceRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const changesRef  = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Load own profile once
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('id, clinic_id, full_name')
        .eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data as Profile) })
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      presenceRef.current?.untrack()
      presenceRef.current?.unsubscribe()
      changesRef.current?.unsubscribe()
    }
  }, [])

  const goOnline = async () => {
    if (!profile) return
    const supabase = createClient()

    // 1. Join presence channel for this clinic
    const presence = supabase.channel(`clinic-available:${profile.clinic_id}`)
    presence.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presence.track({
          vet_id:   profile.id,
          vet_name: profile.full_name,
          since:    Date.now(),
        })
        presenceRef.current = presence
        setAvailable(true)
      }
    })

    // 2. Listen for emergency appointments assigned to this vet
    const changes = supabase
      .channel(`vet-emergencies:${profile.id}`)
      .on(
        'postgres_changes' as any,
        {
          event:  'INSERT',
          schema: 'public',
          table:  'appointments',
          filter: `vet_id=eq.${profile.id}`,
        },
        async (payload: any) => {
          if (!payload.new?.is_virtual) return
          // Enrich with pet + owner names
          const { data: appt } = await supabase
            .from('appointments')
            .select('id, reason, pets(name), profiles!appointments_owner_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single()
          if (appt) {
            setIncoming({
              appointment_id: appt.id,
              pet_name:   (appt.pets as any)?.name ?? '—',
              owner_name: (appt.profiles as any)?.full_name ?? '—',
              reason:     appt.reason,
            })
          }
        }
      )
      .subscribe()

    changesRef.current = changes
  }

  const goOffline = async () => {
    await presenceRef.current?.untrack()
    await presenceRef.current?.unsubscribe()
    await changesRef.current?.unsubscribe()
    presenceRef.current = null
    changesRef.current  = null
    setAvailable(false)
  }

  const toggle = () => (available ? goOffline() : goOnline())

  const acceptCall = (apptId: string) => {
    const room = jitsiRoom(apptId)
    window.open(`https://meet.jit.si/${room}`, '_blank', 'noopener,noreferrer')
    setIncoming(null)
  }

  if (!profile) return null

  return (
    <>
      {/* Toggle button in sidebar */}
      <button
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', border: 'none', borderRadius: 10,
          padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12, fontWeight: 600, transition: 'background .15s',
          background: available ? '#edfaf1' : 'transparent',
          color:      available ? '#1a7a3c' : 'var(--pf-muted)',
        }}
        title={available ? 'Desactivar disponibilidad para llamadas' : 'Activar disponibilidad para llamadas de emergencia'}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: available ? '#22c55e' : '#d1d5db',
          boxShadow: available ? '0 0 0 3px rgba(34,197,94,.25)' : 'none',
          animation: available ? 'pulse-green 2s infinite' : 'none',
        }} />
        {available ? 'Disponible para llamadas' : 'No disponible'}
      </button>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,.25); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,.1); }
        }
      `}</style>

      {/* Incoming emergency call overlay */}
      {incoming && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '28px 24px',
            maxWidth: 380, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,.4)',
            animation: 'slide-up .3s ease',
          }}>
            {/* Pulsing ring */}
            <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 16 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'ring-pulse 1.4s infinite',
              }}>
                <PhoneCall size={30} color="#fff" strokeWidth={2} />
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 6px' }}>
              🚨 Llamada de emergencia
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1c1c1e', margin: '0 0 4px', fontFamily: 'var(--pf-font-display)' }}>
              {incoming.pet_name}
            </p>
            <p style={{ fontSize: 14, color: '#8e8e93', margin: '0 0 6px' }}>
              Propietario: {incoming.owner_name}
            </p>
            <p style={{ fontSize: 13, color: '#3c3c43', background: '#f9f9f9', borderRadius: 10, padding: '10px 14px', margin: '12px 0 20px', lineHeight: 1.5 }}>
              {incoming.reason}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIncoming(null)}
                style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X size={15} /> Ignorar
              </button>
              <button onClick={() => acceptCall(incoming.appointment_id)}
                style={{ flex: 2, border: 'none', borderRadius: 12, padding: '13px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Video size={16} /> Aceptar llamada
              </button>
            </div>
          </div>

          <style>{`
            @keyframes ring-pulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
              50% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(239,68,68,0); }
            }
            @keyframes slide-up {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
