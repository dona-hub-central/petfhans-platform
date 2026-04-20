'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ClinicChangeForm({
  currentClinicId,
  profileId,
}: {
  currentClinicId: string
  profileId: string
}) {
  const [slug, setSlug] = useState('')
  const [mode, setMode] = useState<'permanent' | 'access'>('permanent')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading'); setMsg('')

    const supabase = createClient()

    // Buscar clínica por slug
    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('slug', slug.trim().toLowerCase())
      .single()

    if (error || !clinic) {
      setMsg('No se encontró ninguna clínica con ese slug.')
      setStatus('error'); return
    }

    if (clinic.id === currentClinicId) {
      setMsg('Ya perteneces a esta clínica.')
      setStatus('error'); return
    }

    if (mode === 'permanent') {
      // Cambio permanente: actualizar clinic_id del perfil
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ clinic_id: clinic.id })
        .eq('id', profileId)

      if (updateErr) { setMsg('Error al cambiar de clínica: ' + updateErr.message); setStatus('error'); return }
      setMsg(`✅ Clínica cambiada a "${clinic.name}". Recarga la página.`)
      setStatus('ok')
    } else {
      // Acceso temporal: llamar a la API para crear invitación de acceso
      const res = await fetch('/api/owner/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Error al solicitar acceso'); setStatus('error'); return }
      setMsg(`✅ Solicitud enviada a "${clinic.name}". Te contactarán para confirmar el acceso.`)
      setStatus('ok')
    }
    setSlug('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('permanent')}
          className="flex-1 text-xs py-2 rounded-xl border font-medium transition"
          style={{
            background: mode === 'permanent' ? 'var(--pf-coral)' : '#fff',
            color: mode === 'permanent' ? '#fff' : 'var(--pf-muted)',
            borderColor: mode === 'permanent' ? 'var(--pf-coral)' : 'var(--pf-border)',
          }}>
          🔄 Cambio definitivo
        </button>
        <button type="button" onClick={() => setMode('access')}
          className="flex-1 text-xs py-2 rounded-xl border font-medium transition"
          style={{
            background: mode === 'access' ? 'var(--pf-coral)' : '#fff',
            color: mode === 'access' ? '#fff' : 'var(--pf-muted)',
            borderColor: mode === 'access' ? 'var(--pf-coral)' : 'var(--pf-border)',
          }}>
          👁 Dar acceso
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--pf-border)' }}>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            required
            placeholder="slug-de-la-clinica"
            className="flex-1 px-3 py-2.5 text-sm outline-none"
            style={{ color: 'var(--pf-ink)' }}
          />
          <span className="px-2 py-2.5 text-xs border-l"
            style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)', background: 'var(--pf-bg)' }}>
            .petfhans.com
          </span>
        </div>
        <button type="submit" disabled={status === 'loading'}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition"
          style={{ background: 'var(--pf-coral)', color: '#fff' }}>
          {status === 'loading' ? '...' : mode === 'permanent' ? 'Cambiar' : 'Solicitar'}
        </button>
      </div>

      {msg && (
        <p className="text-xs px-3 py-2 rounded-xl"
          style={{
            background: status === 'ok' ? '#edfaf1' : '#fee2e2',
            color: status === 'ok' ? '#166534' : '#dc2626',
          }}>
          {msg}
        </p>
      )}

      <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>
        {mode === 'permanent'
          ? 'El cambio definitivo transfiere tu perfil y el de tus mascotas a la nueva clínica.'
          : 'Dar acceso permite que otra clínica consulte el historial de tus mascotas sin perder tu clínica actual.'}
      </p>
    </form>
  )
}
