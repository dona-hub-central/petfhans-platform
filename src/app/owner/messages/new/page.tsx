'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'

type ClinicOption = { id: string; name: string }
type PetOption    = { id: string; name: string; species: string }

export default function NewMessagePage() {
  const router = useRouter()
  const [clinics, setClinics]   = useState<ClinicOption[]>([])
  const [pets, setPets]         = useState<PetOption[]>([])
  const [clinicId, setClinicId] = useState('')
  const [petId, setPetId]       = useState('')
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: links } = await supabase.from('profile_clinics').select('clinic_id')
      const clinicIds = (links ?? []).map(l => l.clinic_id)
      if (!clinicIds.length) return

      const { data: clinicRows } = await supabase.from('clinics')
        .select('id, name').in('id', clinicIds).order('name')
      setClinics((clinicRows ?? []) as ClinicOption[])
      if (clinicRows?.length === 1) setClinicId(clinicRows[0].id)
    })
  }, [])

  useEffect(() => {
    if (!clinicId) { setPets([]); setPetId(''); return }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: access } = await supabase.from('pet_access').select('pet_id')
      const petIds = (access ?? []).map(a => a.pet_id)
      if (!petIds.length) return
      const { data: petRows } = await supabase.from('pets')
        .select('id, name, species').in('id', petIds).eq('is_active', true).order('name')
      setPets((petRows ?? []) as PetOption[])
    })
  }, [clinicId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicId || !subject.trim() || !body.trim()) {
      setError('Completa todos los campos obligatorios')
      return
    }
    setSending(true); setError('')
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_id: clinicId,
        pet_id:    petId || undefined,
        subject:   subject.trim(),
        body:      body.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al enviar'); setSending(false); return }
    router.push(`/owner/messages/${data.conversation.id}`)
  }

  return (
    <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 16px 24px', maxWidth: 600, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/owner/messages" style={{ display: 'flex', alignItems: 'center', color: 'var(--pf-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ font: 'var(--pf-text-display)', margin: 0, color: 'var(--pf-ink)', fontSize: 22 }}>
          Nuevo mensaje
        </h1>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Clinic */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)', display: 'block', marginBottom: 6 }}>
            Clínica *
          </label>
          {clinics.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--pf-muted)' }}>
              No tienes clínicas vinculadas. <Link href="/marketplace/clinicas" style={{ color: 'var(--pf-coral)' }}>Buscar clínica</Link>
            </p>
          ) : (
            <select
              value={clinicId}
              onChange={e => setClinicId(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--pf-border)',
                background: 'var(--pf-white)', fontSize: 14,
                color: 'var(--pf-ink)', fontFamily: 'inherit',
              }}
            >
              <option value="">Selecciona una clínica</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Pet (optional) */}
        {clinicId && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)', display: 'block', marginBottom: 6 }}>
              Mascota <span style={{ fontWeight: 400, color: 'var(--pf-muted)' }}>(opcional)</span>
            </label>
            <select
              value={petId}
              onChange={e => setPetId(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--pf-border)',
                background: 'var(--pf-white)', fontSize: 14,
                color: 'var(--pf-ink)', fontFamily: 'inherit',
              }}
            >
              <option value="">Sin mascota específica</option>
              {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Subject */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)', display: 'block', marginBottom: 6 }}>
            Asunto *
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Ej: Consulta sobre tratamiento"
            maxLength={200}
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid var(--pf-border)',
              background: 'var(--pf-white)', fontSize: 14,
              color: 'var(--pf-ink)', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Body */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)', display: 'block', marginBottom: 6 }}>
            Mensaje *
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            maxLength={5000}
            required
            rows={5}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid var(--pf-border)',
              background: 'var(--pf-white)', fontSize: 14,
              color: 'var(--pf-ink)', fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--pf-muted)', margin: '4px 0 0', textAlign: 'right' }}>
            {body.length}/5000
          </p>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={sending || !clinicId || !subject.trim() || !body.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', borderRadius: 12, border: 'none',
            background: sending ? 'var(--pf-muted)' : 'var(--pf-coral)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: (!clinicId || !subject.trim() || !body.trim()) && !sending ? 0.6 : 1,
          }}
        >
          <Send size={16} />
          {sending ? 'Enviando…' : 'Enviar mensaje'}
        </button>
      </form>
    </div>
  )
}
