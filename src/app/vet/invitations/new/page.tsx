'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PetSearch from '@/components/shared/PetSearch'

export default function NewInvitationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pets, setPets] = useState<any[]>([])
  const [form, setForm] = useState({ email: '', role: 'pet_owner', pet_id: '' })

  useEffect(() => {
    fetch('/api/vet/pets')
      .then(r => r.json())
      .then(({ pets }) => setPets(pets ?? []))
      .catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/vet/create-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, role: form.role, pet_id: form.pet_id }),
    })
    const result = await res.json()
    if (!res.ok) { setError(result.error ?? 'Error creando invitación'); setLoading(false); return }
    router.push('/vet/invitations?created=true')
  }

  const inputCls = "w-full px-4 py-3 rounded-lg border outline-none transition"
  const inputStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', fontSize: 16 as const }
  const focus = {
    onFocus: (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'var(--pf-coral)' },
    onBlur:  (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'var(--pf-border)' },
  }

  const roles = [
    { value: 'pet_owner',    label: 'Dueño de mascota', desc: 'Accede al perfil de su mascota e historial' },
    { value: 'veterinarian', label: 'Veterinario',      desc: 'Gestiona fichas y consultas' },
    { value: 'vet_admin',    label: 'Administrador',    desc: 'Acceso completo a la clínica' },
  ]

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--pf-border)' }}>
          <a href="/vet/invitations" className="text-xs mb-6 inline-block" style={{ color: 'var(--pf-muted)' }}>← Invitaciones</a>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--pf-ink)' }}>Nueva invitación</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--pf-muted)' }}>El invitado recibirá un link de acceso</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                className={inputCls} style={inputStyle} {...focus} placeholder="dueño@email.com" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--pf-ink)' }}>Rol *</label>
              <div className="space-y-2">
                {roles.map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className="w-full text-left px-4 py-3 rounded-xl border transition"
                    style={{
                      borderColor: form.role === r.value ? 'var(--pf-coral)' : 'var(--pf-border)',
                      background: form.role === r.value ? 'var(--pf-coral-soft)' : '#fff',
                    }}>
                    <p className="text-sm font-medium" style={{ color: form.role === r.value ? 'var(--pf-coral)' : 'var(--pf-ink)' }}>
                      {r.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.role === 'pet_owner' && pets.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
                  Mascota (opcional)
                </label>
                <PetSearch
                  pets={pets}
                  value={form.pet_id}
                  onChange={v => set('pet_id', v)}
                />
              </div>
            )}

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <a href="/vet/invitations"
                className="flex-1 py-3 text-sm font-semibold rounded-lg border text-center"
                style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}>
                Cancelar
              </a>
              <button type="submit" disabled={loading} className="btn-pf flex-1 py-3 text-sm">
                {loading ? 'Creando...' : '✓ Crear invitación'}
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}
