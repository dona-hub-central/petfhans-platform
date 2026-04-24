'use client'

import { useState } from 'react'
import { X, PawPrint, Send } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
}

interface Vet {
  id: string
  full_name: string
}

interface Props {
  clinicId: string
  clinicName: string
  pets: Pet[]
  vets?: Vet[]
  preselectedVetId?: string
}

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Ave' },
  { value: 'rabbit', label: 'Conejo' },
  { value: 'other', label: 'Otro' },
]

export default function CareRequestForm({ clinicId, clinicName, pets, vets = [], preselectedVetId }: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '__new')
  const [petName, setPetName] = useState('')
  const [petSpecies, setPetSpecies] = useState('dog')
  const [reason, setReason] = useState('')
  const [preferredVetId, setPreferredVetId] = useState(preselectedVetId ?? '')

  const isNewPet = selectedPetId === '__new'
  const selectedPet = pets.find(p => p.id === selectedPetId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const resolvedPetName = isNewPet ? petName.trim() : (selectedPet?.name ?? '')
    const resolvedPetSpecies = isNewPet ? petSpecies : (selectedPet?.species ?? '')

    if (!resolvedPetName) {
      setError('Introduce el nombre de la mascota')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/care-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_id: clinicId,
        pet_name: resolvedPetName,
        pet_species: resolvedPetSpecies || null,
        reason: reason.trim() || null,
        preferred_vet_id: preferredVetId || null,
      }),
    })

    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Error al enviar la solicitud')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  const inp = {
    width: '100%', borderRadius: 10, border: '1px solid var(--pf-border)',
    padding: '9px 12px', fontSize: 14, color: 'var(--pf-ink)',
    fontFamily: 'var(--pf-font-body)', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pf"
        style={{ padding: '10px 20px', fontSize: 14 }}
      >
        Solicitar atención
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 0 env(safe-area-inset-bottom)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 520, padding: '24px 20px 32px',
              maxHeight: '90svh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, fontFamily: 'var(--pf-font-display)' }}>
                  Solicitar atención
                </h2>
                <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '2px 0 0' }}>{clinicName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--pf-muted)' }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <PawPrint size={40} style={{ color: 'var(--pf-coral)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
                  Solicitud enviada
                </p>
                <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>
                  La clínica revisará tu solicitud y te notificará por email.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="btn-pf"
                  style={{ marginTop: 20, padding: '10px 24px' }}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Mascota */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pf-muted)', marginBottom: 6 }}>
                    Mascota
                  </label>
                  {pets.length > 0 && (
                    <select
                      value={selectedPetId}
                      onChange={e => setSelectedPetId(e.target.value)}
                      style={inp}
                    >
                      {pets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="__new">+ Nueva mascota</option>
                    </select>
                  )}
                  {(isNewPet || pets.length === 0) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: pets.length > 0 ? 8 : 0 }}>
                      <input
                        placeholder="Nombre de la mascota"
                        value={petName}
                        onChange={e => setPetName(e.target.value)}
                        style={{ ...inp, flex: 1 }}
                        required={isNewPet || pets.length === 0}
                      />
                      <select
                        value={petSpecies}
                        onChange={e => setPetSpecies(e.target.value)}
                        style={{ ...inp, width: 'auto' }}
                      >
                        {SPECIES_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Motivo */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pf-muted)', marginBottom: 6 }}>
                    Motivo de consulta <span style={{ fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    placeholder="Describe brevemente el motivo de la visita..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    style={{ ...inp, resize: 'vertical' }}
                  />
                </div>

                {/* Vet preferido */}
                {vets.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--pf-muted)', marginBottom: 6 }}>
                      Veterinario preferido <span style={{ fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <select
                      value={preferredVetId}
                      onChange={e => setPreferredVetId(e.target.value)}
                      style={inp}
                    >
                      <option value="">Sin preferencia</option>
                      {vets.map(v => (
                        <option key={v.id} value={v.id}>{v.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pf"
                  style={{ padding: '11px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} />
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
