'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function NewRecordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('pet')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pets, setPets] = useState<any[]>([])
  const [form, setForm] = useState({
    pet_id: petId ?? '',
    visit_date: new Date().toISOString().split('T')[0],
    reason: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    next_visit: '',
    medications: [] as { name: string; dose: string; frequency: string; duration: string }[],
  })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('user_id', user.id).single()
      const { data } = await supabase.from('pets').select('id, name, species').eq('clinic_id', profile?.clinic_id).eq('is_active', true)
      setPets(data ?? [])
    }
    load()
  }, [])

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const addMed = () => setForm(p => ({
    ...p,
    medications: [...p.medications, { name: '', dose: '', frequency: '', duration: '' }]
  }))

  const updateMed = (i: number, k: string, v: string) => setForm(p => ({
    ...p,
    medications: p.medications.map((m, idx) => idx === i ? { ...m, [k]: v } : m)
  }))

  const removeMed = (i: number) => setForm(p => ({
    ...p,
    medications: p.medications.filter((_, idx) => idx !== i)
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles')
      .select('id, clinic_id').eq('user_id', user.id).single()

    const { data: record, error: err } = await supabase.from('medical_records').insert({
      pet_id:      form.pet_id,
      clinic_id:   profile!.clinic_id,
      vet_id:      profile!.id,
      visit_date:  form.visit_date,
      reason:      form.reason,
      diagnosis:   form.diagnosis || null,
      treatment:   form.treatment || null,
      notes:       form.notes || null,
      next_visit:  form.next_visit || null,
      medications: form.medications.filter(m => m.name),
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/vet/records/${record.id}?created=true`)
  }

  const inputCls = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text)' }
  const focus = { onFocus: (e: any) => e.target.style.borderColor = 'var(--accent)', onBlur: (e: any) => e.target.style.borderColor = 'var(--border)' }
  const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--border)' }}>
          <a href={form.pet_id ? `/vet/pets/${form.pet_id}` : '/vet/pets'}
            className="text-xs mb-6 inline-block" style={{ color: 'var(--muted)' }}>← Volver</a>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Nueva consulta</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Registro clínico</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paciente y fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Paciente *</label>
                <select value={form.pet_id} onChange={e => set('pet_id', e.target.value)} required
                  className={inputCls} style={inputStyle}>
                  <option value="">Seleccionar mascota</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>
                      {speciesIcon[p.species]} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Fecha *</label>
                <input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} required
                  className={inputCls} style={inputStyle} {...focus} />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Motivo de consulta *</label>
              <input value={form.reason} onChange={e => set('reason', e.target.value)} required
                className={inputCls} style={inputStyle} {...focus}
                placeholder="Ej: Control rutinario, vómitos, fiebre..." />
            </div>

            {/* Diagnóstico y tratamiento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Diagnóstico</label>
                <textarea value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
                  rows={3} className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition resize-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  placeholder="Diagnóstico clínico..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Tratamiento</label>
                <textarea value={form.treatment} onChange={e => set('treatment', e.target.value)}
                  rows={3} className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition resize-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  placeholder="Tratamiento indicado..." />
              </div>
            </div>

            {/* Medicamentos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Medicamentos</label>
                <button type="button" onClick={addMed}
                  className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  + Agregar
                </button>
              </div>
              {form.medications.map((med, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                  {['name', 'dose', 'frequency', 'duration'].map((k, ki) => (
                    <input key={k} value={(med as any)[k]} onChange={e => updateMed(i, k, e.target.value)}
                      className={inputCls} style={inputStyle} {...focus}
                      placeholder={['Medicamento', 'Dosis', 'Frecuencia', 'Duración'][ki]} />
                  ))}
                  <button type="button" onClick={() => removeMed(i)}
                    className="col-span-4 text-xs text-right" style={{ color: 'var(--muted)' }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Notas adicionales</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition resize-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  placeholder="Observaciones adicionales..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Próxima visita</label>
                <input type="date" value={form.next_visit} onChange={e => set('next_visit', e.target.value)}
                  className={inputCls} style={inputStyle} {...focus} />
              </div>
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--accent-s)', color: 'var(--accent-h)' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <a href="/vet/pets"
                className="flex-1 py-3 text-sm font-semibold rounded-lg border text-center"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                Cancelar
              </a>
              <button type="submit" disabled={loading} className="btn-pf flex-1 py-3 text-sm">
                {loading ? 'Guardando...' : '✓ Guardar consulta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewRecordPage() {
  return (
    <Suspense>
      <NewRecordForm />
    </Suspense>
  )
}
