'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BreedSelect from '@/components/shared/BreedSelect'

export default function NewPetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', species: 'dog', breed: '', gender: 'male',
    birth_date: '', weight: '', neutered: false,
    microchip: '', notes: '',
  })

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles')
      .select('id, clinic_id').eq('user_id', user.id).single()

    const { data: pet, error: err } = await supabase.from('pets').insert({
      clinic_id:  profile!.clinic_id,
      owner_id:   profile!.id,
      name:       form.name,
      species:    form.species,
      breed:      form.breed || null,
      gender:     form.gender,
      birth_date: form.birth_date || null,
      weight:     form.weight ? parseFloat(form.weight) : null,
      neutered:   form.neutered,
      microchip:  form.microchip || null,
      notes:      form.notes || null,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/vet/pets/${pet.id}?created=true`)
  }

  const inputCls = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
  const inputStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }
  const focus = { onFocus: (e: any) => e.target.style.borderColor = 'var(--pf-coral)', onBlur: (e: any) => e.target.style.borderColor = 'var(--pf-border)' }

  const species = [
    { value: 'dog',    label: '🐶 Perro' },
    { value: 'cat',    label: '🐱 Gato' },
    { value: 'bird',   label: '🐦 Ave' },
    { value: 'rabbit', label: '🐰 Conejo' },
    { value: 'other',  label: '🐾 Otro' },
  ]

  return (
    <div className="min-h-screen flex items-start justify-center p-8" style={{ background: 'var(--pf-bg)' }}>
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--pf-border)' }}>
          <a href="/vet/pets" className="text-xs mb-6 inline-block" style={{ color: 'var(--pf-muted)' }}>← Mascotas</a>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--pf-ink)' }}>Nueva mascota</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--pf-muted)' }}>Registra un nuevo paciente</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Especie */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--pf-ink)' }}>Especie</label>
              <div className="flex gap-2 flex-wrap">
                {species.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => set('species', s.value)}
                    className="px-4 py-2 rounded-xl text-sm font-medium border transition"
                    style={{
                      borderColor: form.species === s.value ? 'var(--pf-coral)' : 'var(--pf-border)',
                      background: form.species === s.value ? 'var(--pf-coral-soft)' : '#fff',
                      color: form.species === s.value ? 'var(--pf-coral)' : 'var(--pf-muted)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Nombre *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required
                  className={inputCls} style={inputStyle} {...focus} placeholder="Luna" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Raza</label>
                <BreedSelect species={form.species} value={form.breed} onChange={v => set('breed', v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Sexo</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: '♂ Macho' }, { v: 'female', l: '♀ Hembra' }].map(g => (
                    <button key={g.v} type="button" onClick={() => set('gender', g.v)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition"
                      style={{
                        borderColor: form.gender === g.v ? 'var(--pf-coral)' : 'var(--pf-border)',
                        background: form.gender === g.v ? 'var(--pf-coral-soft)' : '#fff',
                        color: form.gender === g.v ? 'var(--pf-coral)' : 'var(--pf-muted)',
                      }}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Fecha de nacimiento</label>
                <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)}
                  className={inputCls} style={inputStyle} {...focus} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Peso (kg)</label>
                <input type="number" step="0.1" value={form.weight} onChange={e => set('weight', e.target.value)}
                  className={inputCls} style={inputStyle} {...focus} placeholder="4.5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Microchip</label>
                <input value={form.microchip} onChange={e => set('microchip', e.target.value)}
                  className={inputCls} style={inputStyle} {...focus} placeholder="985112345678900" />
              </div>
            </div>

            {/* Castrado */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('neutered', !form.neutered)}
                className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: form.neutered ? 'var(--pf-coral)' : 'var(--pf-border)' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: form.neutered ? 'translateX(18px)' : 'translateX(2px)' }} />
              </button>
              <span className="text-sm" style={{ color: 'var(--pf-ink)' }}>
                {form.neutered ? 'Castrado/Esterilizado' : 'No castrado'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Notas adicionales</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition resize-none"
                style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                onBlur={e => e.target.style.borderColor = 'var(--pf-border)'}
                placeholder="Alergias, condiciones previas, comportamiento..." />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <a href="/vet/pets"
                className="flex-1 py-3 text-sm font-semibold rounded-lg border text-center transition"
                style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}>
                Cancelar
              </a>
              <button type="submit" disabled={loading} className="btn-pf flex-1 py-3 text-sm">
                {loading ? 'Guardando...' : 'Registrar mascota'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
