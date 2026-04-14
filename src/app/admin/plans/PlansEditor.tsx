'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Plan = {
  id: string; name: string
  price_monthly: number; price_yearly: number
  max_patients: number; max_users: number
  features: string[]; is_active: boolean
}

const PLAN_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  trial: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  basic: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  pro:   { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
}

export default function PlansEditor({ plans: initial }: { plans: Plan[] }) {
  const [plans, setPlans] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Plan>>({})
  const [newFeature, setNewFeature] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  const startEdit = (p: Plan) => {
    setEditing(p.id)
    setForm({ ...p, features: [...p.features] })
  }

  const cancel = () => { setEditing(null); setForm({}) }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setForm(f => ({ ...f, features: [...(f.features ?? []), newFeature.trim()] }))
    setNewFeature('')
  }

  const removeFeature = (i: number) =>
    setForm(f => ({ ...f, features: (f.features ?? []).filter((_, idx) => idx !== i) }))

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('subscription_plans').update({
      name:           form.name,
      price_monthly:  form.price_monthly,
      price_yearly:   form.price_yearly,
      max_patients:   form.max_patients,
      max_users:      form.max_users,
      features:       form.features,
      is_active:      form.is_active,
      updated_at:     new Date().toISOString(),
    }).eq('id', editing!)

    if (!error) {
      setPlans(prev => prev.map(p => p.id === editing ? { ...p, ...form } as Plan : p))
      setSaved(editing)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(false)
    setEditing(null)
    setForm({})
  }

  const inp = "w-full px-3 py-2 text-sm border rounded-xl outline-none"
  const inpS = { borderColor: 'var(--border)', color: 'var(--text)' }
  const f = { onFocus: (e: any) => e.target.style.borderColor = 'var(--accent)', onBlur: (e: any) => e.target.style.borderColor = 'var(--border)' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {plans.map(p => {
        const c = PLAN_COLORS[p.id] ?? PLAN_COLORS.basic
        const isEditing = editing === p.id
        const data = isEditing ? form : p

        return (
          <div key={p.id} className="bg-white rounded-2xl border overflow-hidden"
            style={{ borderColor: c.border, boxShadow: `0 0 0 1px ${c.border}` }}>

            {/* Header plan */}
            <div className="px-5 py-4 border-b" style={{ background: c.bg, borderColor: c.border }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: '#fff', color: c.color }}>{p.name}</span>
                <div className="flex items-center gap-2">
                  {saved === p.id && <span className="text-xs font-medium" style={{ color: '#1a7a3c' }}>✓</span>}
                  {!isEditing && (
                    <button onClick={() => startEdit(p)}
                      className="text-xs font-medium px-3 py-1 rounded-lg"
                      style={{ background: '#fff', color: c.color }}>
                      Editar
                    </button>
                  )}
                </div>
              </div>

              {/* Precio */}
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: c.color }}>€/mes</label>
                    <input type="number" value={data.price_monthly ?? ''} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) }))}
                      className={inp} style={inpS} {...f} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: c.color }}>€/año</label>
                    <input type="number" value={data.price_yearly ?? ''} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) }))}
                      className={inp} style={inpS} {...f} />
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-2xl font-bold" style={{ color: c.color }}>
                    {p.price_monthly === 0 ? 'Gratis' : `${p.price_monthly}€/mes`}
                  </p>
                  {p.price_yearly > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: c.color }}>o {p.price_yearly}€/año</p>
                  )}
                </div>
              )}
            </div>

            {/* Cuerpo */}
            <div className="p-5 space-y-4">
              {/* Límites */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Máx. pacientes</p>
                  {isEditing ? (
                    <input type="number" value={data.max_patients ?? ''} onChange={e => setForm(f => ({ ...f, max_patients: parseInt(e.target.value) }))}
                      className={inp} style={inpS} {...f} />
                  ) : (
                    <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                      {p.max_patients >= 999 ? '∞' : p.max_patients}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Máx. usuarios</p>
                  {isEditing ? (
                    <input type="number" value={data.max_users ?? ''} onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) }))}
                      className={inp} style={inpS} {...f} />
                  ) : (
                    <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                      {p.max_users >= 99 ? '∞' : p.max_users}
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Incluye</p>
                <ul className="space-y-1.5">
                  {(isEditing ? form.features ?? [] : p.features).map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                      <span style={{ color: c.color }}>✓</span>
                      <span className="flex-1">{feat}</span>
                      {isEditing && (
                        <button onClick={() => removeFeature(i)}
                          className="text-xs" style={{ color: '#dc2626' }}>✕</button>
                      )}
                    </li>
                  ))}
                </ul>

                {isEditing && (
                  <div className="flex gap-2 mt-2">
                    <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      placeholder="Nueva característica…"
                      className={`${inp} flex-1`} style={inpS} {...f} />
                    <button onClick={addFeature} className="text-xs font-semibold px-3 rounded-xl"
                      style={{ background: c.bg, color: c.color }}>+</button>
                  </div>
                )}
              </div>

              {/* Estado activo */}
              {isEditing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active ?? true}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Plan activo (visible para clínicas)</span>
                </label>
              )}

              {/* Acciones edición */}
              {isEditing && (
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={cancel} className="flex-1 py-2 text-sm rounded-xl border"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    Cancelar
                  </button>
                  <button onClick={save} disabled={saving}
                    className="flex-2 px-5 py-2 text-sm font-semibold rounded-xl"
                    style={{ background: c.color, color: '#fff', opacity: saving ? .7 : 1 }}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
