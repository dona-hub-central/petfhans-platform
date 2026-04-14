'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PLANS = [
  { value: 'trial', label: 'Trial',  bg: '#f3f4f6', color: '#6b7280', patients: 50  },
  { value: 'basic', label: 'Basic',  bg: '#eff6ff', color: '#2563eb', patients: 200 },
  { value: 'pro',   label: 'Pro',    bg: '#faf5ff', color: '#7c3aed', patients: 999 },
]
const STATUSES = [
  { value: 'trial',    label: 'Trial',    bg: '#fff8e6', color: '#b07800' },
  { value: 'active',   label: 'Activa',   bg: '#edfaf1', color: '#1a7a3c' },
  { value: 'inactive', label: 'Inactiva', bg: '#fee2e2', color: '#dc2626' },
]

type Clinic = {
  id: string
  name: string
  slug: string
  subscription_plan: string
  subscription_status: string
  max_patients: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export default function SubscriptionManager({ clinics: initial }: { clinics: Clinic[] }) {
  const [clinics, setClinics] = useState(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Clinic>>({})

  const startEdit = (c: Clinic) => {
    setEditing(c.id)
    setForm({ subscription_plan: c.subscription_plan, subscription_status: c.subscription_status, max_patients: c.max_patients })
  }

  const cancel = () => { setEditing(null); setForm({}) }

  const save = async (id: string) => {
    setSaving(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('clinics')
      .update({
        subscription_plan:   form.subscription_plan,
        subscription_status: form.subscription_status,
        max_patients:        Number(form.max_patients),
      })
      .eq('id', id)

    if (!error) {
      setClinics(prev => prev.map(c => c.id === id ? { ...c, ...form } as Clinic : c))
      setSaved(id)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
    setEditing(null)
    setForm({})
  }

  const onPlanChange = (val: string) => {
    const plan = PLANS.find(p => p.value === val)
    setForm(f => ({ ...f, subscription_plan: val, max_patients: plan?.patients ?? f.max_patients }))
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            {['Clínica', 'Plan', 'Estado', 'Máx. pacientes', 'Stripe', 'Acciones'].map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {clinics.map(c => {
            const isEditing = editing === c.id
            const plan   = PLANS.find(p => p.value === (isEditing ? form.subscription_plan : c.subscription_plan)) ?? PLANS[0]
            const status = STATUSES.find(s => s.value === (isEditing ? form.subscription_status : c.subscription_status)) ?? STATUSES[0]

            return (
              <tr key={c.id} className="hover:bg-gray-50 transition">
                {/* Clínica */}
                <td className="px-5 py-4">
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.slug}.petfhans.com</p>
                </td>

                {/* Plan */}
                <td className="px-5 py-4">
                  {isEditing ? (
                    <select value={form.subscription_plan}
                      onChange={e => onPlanChange(e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1.5 outline-none"
                      style={{ borderColor: 'var(--border)' }}>
                      {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: plan.bg, color: plan.color }}>{plan.label}</span>
                  )}
                </td>

                {/* Estado */}
                <td className="px-5 py-4">
                  {isEditing ? (
                    <select value={form.subscription_status}
                      onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}
                      className="text-xs border rounded-lg px-2 py-1.5 outline-none"
                      style={{ borderColor: 'var(--border)' }}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: status.bg, color: status.color }}>{status.label}</span>
                  )}
                </td>

                {/* Máx pacientes */}
                <td className="px-5 py-4">
                  {isEditing ? (
                    <input type="number" value={form.max_patients}
                      onChange={e => setForm(f => ({ ...f, max_patients: Number(e.target.value) }))}
                      className="text-xs border rounded-lg px-2 py-1.5 outline-none w-20"
                      style={{ borderColor: 'var(--border)' }} />
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{c.max_patients}</span>
                  )}
                </td>

                {/* Stripe */}
                <td className="px-5 py-4">
                  {c.stripe_customer_id ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#edfaf1', color: '#1a7a3c' }}>
                      ✓ Conectado
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-5 py-4">
                  {saved === c.id ? (
                    <span className="text-xs font-medium" style={{ color: '#1a7a3c' }}>✓ Guardado</span>
                  ) : isEditing ? (
                    <div className="flex gap-2">
                      <button onClick={() => save(c.id)} disabled={!!saving}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {saving === c.id ? '...' : 'Guardar'}
                      </button>
                      <button onClick={cancel}
                        className="text-xs px-3 py-1.5 rounded-lg border transition"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(c)}
                      className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
