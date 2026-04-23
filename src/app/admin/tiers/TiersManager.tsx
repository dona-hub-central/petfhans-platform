'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart2 } from 'lucide-react'

type Tier = {
  id: string; name: string
  min_patients: number; max_patients: number | null
  price_monthly: number; price_yearly: number | null
  description: string | null; is_active: boolean; sort_order: number
}

const emptyTier: Omit<Tier, 'id'> = {
  name: '', min_patients: 0, max_patients: null,
  price_monthly: 0, price_yearly: null,
  description: '', is_active: true, sort_order: 0,
}

export default function TiersManager({ tiers: initial }: { tiers: Tier[] }) {
  const [tiers, setTiers] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<Tier>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof Tier>(k: K, v: Tier[K]) => setForm(f => ({ ...f, [k]: v }))

  const startCreate = () => {
    setCreating(true); setEditing(null)
    setForm({ ...emptyTier, sort_order: tiers.length })
  }

  const startEdit = (t: Tier) => {
    setEditing(t.id); setCreating(false)
    setForm({ ...t })
  }

  const cancel = () => { setEditing(null); setCreating(false); setForm({}); setError('') }

  const save = async () => {
    if (!form.name || form.price_monthly === undefined) { setError('Nombre y precio mensual son obligatorios'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    if (creating) {
      const { data, error: err } = await supabase.from('clinic_tiers').insert({
        name: form.name, min_patients: form.min_patients ?? 0,
        max_patients: form.max_patients ?? null,
        price_monthly: form.price_monthly,
        price_yearly: form.price_yearly ?? null,
        description: form.description || null,
        is_active: form.is_active ?? true,
        sort_order: form.sort_order ?? tiers.length,
      }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setTiers(prev => [...prev, data].sort((a, b) => a.min_patients - b.min_patients))
    } else {
      const { error: err } = await supabase.from('clinic_tiers').update({
        name: form.name, min_patients: form.min_patients,
        max_patients: form.max_patients ?? null,
        price_monthly: form.price_monthly,
        price_yearly: form.price_yearly ?? null,
        description: form.description || null,
        is_active: form.is_active,
      }).eq('id', editing!)
      if (err) { setError(err.message); setSaving(false); return }
      setTiers(prev => prev.map(t => t.id === editing ? { ...t, ...form } as Tier : t).sort((a, b) => a.min_patients - b.min_patients))
    }
    cancel(); setSaving(false)
  }

  const deleteTier = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar tarifa "${name}"?`)) return
    const supabase = createClient()
    await supabase.from('clinic_tiers').delete().eq('id', id)
    setTiers(prev => prev.filter(t => t.id !== id))
  }

  const inp = "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition"
  const inpS = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', background: '#fff' }
  const f = {
    onFocus: (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-coral)' },
    onBlur:  (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-border)' },
  }

  const showForm = creating || editing !== null

  return (
    <div>
      {/* Botón crear */}
      {!showForm && (
        <button onClick={startCreate} className="btn-pf px-5 py-2.5 text-sm mb-6 inline-flex items-center gap-2">
          + Nueva tarifa
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h3 className="font-semibold text-sm mb-5" style={{ color: 'var(--pf-ink)' }}>
            {creating ? 'Nueva tarifa' : 'Editar tarifa'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Nombre del tramo *</label>
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                placeholder="Ej: Starter, Básico, Estándar…" className={inp} style={inpS} {...f} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Desde (pacientes)</label>
              <input type="number" value={form.min_patients ?? 0} onChange={e => set('min_patients', parseInt(e.target.value))}
                placeholder="0" className={inp} style={inpS} {...f} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Hasta (pacientes) <span style={{fontWeight:400}}>— vacío = ilimitado</span></label>
              <input type="number" value={form.max_patients ?? ''} onChange={e => set('max_patients', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="50" className={inp} style={inpS} {...f} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Precio mensual (€) *</label>
              <input type="number" step="0.01" value={form.price_monthly ?? ''} onChange={e => set('price_monthly', parseFloat(e.target.value))}
                placeholder="199" className={inp} style={inpS} {...f} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Precio anual (€) <span style={{fontWeight:400}}>— opcional</span></label>
              <input type="number" step="0.01" value={form.price_yearly ?? ''} onChange={e => set('price_yearly', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="1990" className={inp} style={inpS} {...f} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Descripción</label>
              <input value={form.description ?? ''} onChange={e => set('description', e.target.value)}
                placeholder="Para clínicas pequeñas…" className={inp} style={inpS} {...f} />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} />
                <span className="text-sm" style={{ color: 'var(--pf-ink)' }}>Tarifa activa</span>
              </label>
            </div>
          </div>
          {error && <p className="text-sm mb-3" style={{ color: '#dc2626' }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={cancel} className="px-5 py-2.5 text-sm rounded-xl border"
              style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-pf px-6 py-2.5 text-sm">
              {saving ? 'Guardando…' : creating ? 'Crear tarifa' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de tarifas */}
      {tiers.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
            <BarChart2 size={40} strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Sin tarifas definidas. Crea la primera.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--pf-bg)', borderBottom: '1px solid var(--pf-border)' }}>
                {['Nombre', 'Tramo de pacientes', '€/mes', '€/año', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--pf-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
              {tiers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="font-semibold" style={{ color: 'var(--pf-ink)' }}>{t.name}</p>
                    {t.description && <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{t.description}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                      {t.min_patients} – {t.max_patients ?? '∞'}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold" style={{ color: 'var(--pf-ink)' }}>{t.price_monthly}€</td>
                  <td className="px-5 py-4" style={{ color: 'var(--pf-muted)' }}>{t.price_yearly ? `${t.price_yearly}€` : '—'}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: t.is_active ? '#edfaf1' : '#fee2e2', color: t.is_active ? '#1a7a3c' : '#dc2626' }}>
                      {t.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(t)} className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>Editar</button>
                      <button onClick={() => deleteTier(t.id, t.name)} className="text-xs" style={{ color: '#dc2626' }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
