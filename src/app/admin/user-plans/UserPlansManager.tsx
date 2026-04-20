'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Layers } from 'lucide-react'

const APP_FEATURES = [
  { key: 'pets',         label: 'Gestión de mascotas',  desc: 'Ver y crear fichas de mascotas' },
  { key: 'records',      label: 'Consultas',            desc: 'Registrar y ver historial clínico' },
  { key: 'invitations',  label: 'Invitaciones',         desc: 'Invitar dueños y equipo' },
  { key: 'files',        label: 'Archivos',             desc: 'Subir y ver documentos' },
  { key: 'ai',           label: 'IA Clínica',           desc: 'Análisis con inteligencia artificial' },
  { key: 'team',         label: 'Equipo',               desc: 'Ver y gestionar el equipo' },
  { key: 'stats',        label: 'Estadísticas',         desc: 'Métricas y reportes' },
]

type UserPlan = {
  id: string; name: string
  price_per_seat: number
  features: string[]
  permissions: Record<string, boolean>
  is_active: boolean; sort_order: number
}

const emptyPlan = {
  name: '', price_per_seat: 0,
  features: [] as string[],
  permissions: Object.fromEntries(APP_FEATURES.map(f => [f.key, false])) as Record<string, boolean>,
  is_active: true, sort_order: 0,
}

export default function UserPlansManager({ plans: initial }: { plans: UserPlan[] }) {
  const [plans, setPlans] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<UserPlan>>({})
  const [newFeature, setNewFeature] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const togglePerm = (key: string) => setForm(f => ({
    ...f, permissions: { ...(f.permissions ?? {}), [key]: !(f.permissions ?? {})[key] }
  }))

  const startCreate = () => {
    setCreating(true); setEditing(null)
    setForm({ ...emptyPlan, permissions: { ...emptyPlan.permissions }, features: [], sort_order: plans.length })
  }

  const startEdit = (p: UserPlan) => {
    setEditing(p.id); setCreating(false)
    setForm({ ...p, features: [...(p.features ?? [])], permissions: { ...emptyPlan.permissions, ...p.permissions } })
  }

  const cancel = () => { setEditing(null); setCreating(false); setForm({}); setError('') }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setForm(f => ({ ...f, features: [...(f.features ?? []), newFeature.trim()] }))
    setNewFeature('')
  }

  const removeFeat = (i: number) => setForm(f => ({ ...f, features: (f.features ?? []).filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!form.name) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    const payload = {
      name: form.name, price_per_seat: form.price_per_seat ?? 0,
      features: form.features ?? [],
      permissions: form.permissions ?? {},
      is_active: form.is_active ?? true,
      sort_order: form.sort_order ?? 0,
    }

    if (creating) {
      const { data, error: err } = await supabase.from('user_plans').insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setPlans(prev => [...prev, data])
    } else {
      const { error: err } = await supabase.from('user_plans').update(payload).eq('id', editing!)
      if (err) { setError(err.message); setSaving(false); return }
      setPlans(prev => prev.map(p => p.id === editing ? { ...p, ...payload, id: p.id } : p))
    }
    cancel(); setSaving(false)
  }

  const deletePlan = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar plan "${name}"?`)) return
    const supabase = createClient()
    await supabase.from('user_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  const inp = "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition"
  const inpS = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', background: '#fff' }
  const fcs = { onFocus: (e:any) => e.target.style.borderColor='var(--pf-coral)', onBlur: (e:any) => e.target.style.borderColor='var(--pf-border)' }

  const showForm = creating || editing !== null

  return (
    <div>
      {!showForm && (
        <button onClick={startCreate} className="btn-pf px-5 py-2.5 text-sm mb-6 inline-flex items-center gap-2">
          + Nuevo plan de usuario
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h3 className="font-semibold text-sm mb-5" style={{ color: 'var(--pf-ink)' }}>
            {creating ? 'Nuevo plan de usuario' : 'Editar plan'}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Nombre del plan *</label>
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                placeholder="Ej: Básico, Premium, Ilimitado…" className={inp} style={inpS} {...fcs} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Precio por usuario/mes (€)</label>
              <input type="number" step="0.01" value={form.price_per_seat ?? ''} onChange={e => set('price_per_seat', parseFloat(e.target.value) || 0)}
                placeholder="0" className={inp} style={inpS} {...fcs} />
            </div>
          </div>

          {/* Accesos a la app */}
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--pf-muted)' }}>
              Acceso a funciones de la app
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APP_FEATURES.map(feat => {
                const active = !!(form.permissions ?? {})[feat.key]
                return (
                  <label key={feat.key} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition"
                    style={{
                      borderColor: active ? 'var(--pf-coral)' : 'var(--pf-border)',
                      background: active ? 'var(--pf-coral-soft)' : '#fff',
                    }}>
                    <input type="checkbox" checked={active} onChange={() => togglePerm(feat.key)} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: active ? 'var(--pf-coral)' : 'var(--pf-ink)' }}>
                        {feat.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{feat.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Características extra */}
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--pf-muted)' }}>Características destacadas</label>
            <div className="space-y-1.5 mb-2">
              {(form.features ?? []).map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs flex-1 px-3 py-1.5 rounded-lg" style={{ background: 'var(--pf-bg)', color: 'var(--pf-ink)' }}>
                    ✓ {feat}
                  </span>
                  <button onClick={() => removeFeat(i)} className="text-xs" style={{ color: '#dc2626' }}>✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="Añadir característica…" className={`${inp} flex-1`} style={inpS} {...fcs} />
              <button onClick={addFeature} className="px-3 text-sm rounded-xl"
                style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>+</button>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-5 cursor-pointer">
            <input type="checkbox" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} />
            <span className="text-sm" style={{ color: 'var(--pf-ink)' }}>Plan activo</span>
          </label>

          {error && <p className="text-sm mb-3" style={{ color: '#dc2626' }}>{error}</p>}

          <div className="flex gap-3">
            <button onClick={cancel} className="px-5 py-2.5 text-sm rounded-xl border"
              style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-pf px-6 py-2.5 text-sm">
              {saving ? 'Guardando…' : creating ? 'Crear plan' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de planes */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
            <Layers size={40} strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Sin planes de usuario. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm" style={{ color: 'var(--pf-ink)' }}>{p.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: p.is_active ? '#edfaf1' : '#fee2e2', color: p.is_active ? '#1a7a3c' : '#dc2626' }}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xl font-bold mt-1" style={{ color: 'var(--pf-coral)' }}>
                  {p.price_per_seat === 0 ? 'Gratis' : `${p.price_per_seat}€/usuario`}
                </p>
              </div>
              <div className="p-5 space-y-4">
                {/* Accesos activos */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--pf-muted)' }}>Accesos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {APP_FEATURES.filter(f => p.permissions?.[f.key]).map(f => (
                      <span key={f.key} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                        {f.label.split(' ')[0]} {f.label.split(' ').slice(1).join(' ')}
                      </span>
                    ))}
                    {!APP_FEATURES.some(f => p.permissions?.[f.key]) && (
                      <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>Sin accesos configurados</span>
                    )}
                  </div>
                </div>
                {/* Features */}
                {p.features?.length > 0 && (
                  <ul className="space-y-1">
                    {p.features.map((feat, i) => (
                      <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
                        <span style={{ color: 'var(--pf-coral)' }}>✓</span>{feat}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--pf-border)' }}>
                  <button onClick={() => startEdit(p)} className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>Editar</button>
                  <button onClick={() => deletePlan(p.id, p.name)} className="text-xs" style={{ color: '#dc2626' }}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
