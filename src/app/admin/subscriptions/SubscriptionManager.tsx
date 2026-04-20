'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PLANS = [
  { value: 'trial', label: 'Trial', bg: '#f3f4f6', color: '#6b7280', patients: 50  },
  { value: 'basic', label: 'Basic', bg: '#eff6ff', color: '#2563eb', patients: 200 },
  { value: 'pro',   label: 'Pro',   bg: '#faf5ff', color: '#7c3aed', patients: 999 },
]
const STATUSES = [
  { value: 'trial',    label: 'Trial',    bg: '#fff8e6', color: '#b07800' },
  { value: 'active',   label: 'Activa',   bg: '#edfaf1', color: '#1a7a3c' },
  { value: 'inactive', label: 'Inactiva', bg: '#fee2e2', color: '#dc2626' },
]
const ROLES = [
  { value: 'vet_admin',    label: 'Admin',       color: '#7c3aed' },
  { value: 'veterinarian', label: 'Veterinario', color: '#2563eb' },
]

type User = { id: string; full_name: string; email: string; role: string; created_at: string }
type Clinic = {
  id: string; name: string; slug: string
  subscription_plan: string; subscription_status: string
  max_patients: number; stripe_customer_id: string | null; users: User[]
}

export default function SubscriptionManager({ clinics: initial }: { clinics: Clinic[] }) {
  const [clinics, setClinics] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Clinic>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const startEdit = (c: Clinic) => {
    setEditing(c.id)
    setForm({ subscription_plan: c.subscription_plan, subscription_status: c.subscription_status, max_patients: c.max_patients })
  }
  const cancel = () => { setEditing(null); setForm({}) }

  const save = async (id: string) => {
    setSaving(id)
    const supabase = createClient()
    const { error } = await supabase.from('clinics').update({
      subscription_plan:   form.subscription_plan,
      subscription_status: form.subscription_status,
      max_patients:        Number(form.max_patients),
    }).eq('id', id)
    if (!error) {
      setClinics(prev => prev.map(c => c.id === id ? { ...c, ...form } as Clinic : c))
      setSaved(id); setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null); setEditing(null); setForm({})
  }

  const updateUserRole = async (userId: string, clinicId: string, newRole: string) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setClinics(prev => prev.map(c => c.id === clinicId
      ? { ...c, users: c.users.map(u => u.id === userId ? { ...u, role: newRole } : u) }
      : c
    ))
  }

  const removeUser = async (userId: string, clinicId: string) => {
    if (!confirm('¿Quitar acceso de este usuario a la clínica?')) return
    const supabase = createClient()
    await supabase.from('profiles').update({ clinic_id: null }).eq('id', userId)
    setClinics(prev => prev.map(c => c.id === clinicId
      ? { ...c, users: c.users.filter(u => u.id !== userId) }
      : c
    ))
  }

  return (
    <div className="space-y-3">
      {clinics.map(c => {
        const plan   = PLANS.find(p => p.value === (editing === c.id ? form.subscription_plan : c.subscription_plan)) ?? PLANS[0]
        const status = STATUSES.find(s => s.value === (editing === c.id ? form.subscription_status : c.subscription_status)) ?? STATUSES[0]
        const isOpen = expanded === c.id

        return (
          <div key={c.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
            {/* Cabecera clínica */}
            <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => setExpanded(isOpen ? null : c.id)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'var(--pf-coral-soft)' }}>🏥</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>{c.name}</p>
                <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>{c.slug}.petfhans.com · {c.users.length} usuario{c.users.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: plan.bg, color: plan.color }}>{plan.label}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: status.bg, color: status.color }}>{status.label}</span>
                {saved === c.id && <span className="text-xs font-medium" style={{ color: '#1a7a3c' }}>✓</span>}
                <span style={{ color: 'var(--pf-muted)', transition: 'transform .2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>
            </div>

            {/* Panel expandido */}
            {isOpen && (
              <div className="border-t px-5 py-4 space-y-5" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>

                {/* Editar suscripción */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--pf-muted)' }}>Suscripción</p>
                    {editing !== c.id && (
                      <button onClick={() => startEdit(c)} className="text-xs font-medium" style={{ color: 'var(--pf-coral)' }}>Editar</button>
                    )}
                  </div>

                  {editing === c.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {PLANS.map(p => (
                          <button key={p.value} type="button"
                            onClick={() => setForm(f => ({ ...f, subscription_plan: p.value, max_patients: p.patients }))}
                            className="py-2 rounded-xl border text-xs font-semibold transition"
                            style={{
                              background: form.subscription_plan === p.value ? p.bg : '#fff',
                              borderColor: form.subscription_plan === p.value ? p.color : 'var(--pf-border)',
                              color: form.subscription_plan === p.value ? p.color : 'var(--pf-muted)',
                            }}>{p.label}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {STATUSES.map(s => (
                          <button key={s.value} type="button"
                            onClick={() => setForm(f => ({ ...f, subscription_status: s.value }))}
                            className="py-2 rounded-xl border text-xs font-semibold transition"
                            style={{
                              background: form.subscription_status === s.value ? s.bg : '#fff',
                              borderColor: form.subscription_status === s.value ? s.color : 'var(--pf-border)',
                              color: form.subscription_status === s.value ? s.color : 'var(--pf-muted)',
                            }}>{s.label}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs" style={{ color: 'var(--pf-muted)' }}>Máx. pacientes:</label>
                        <input type="number" value={form.max_patients ?? ''} onChange={e => setForm(f => ({ ...f, max_patients: parseInt(e.target.value) }))}
                          className="px-3 py-1.5 text-sm border rounded-xl outline-none w-24"
                          style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                          onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                          onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={cancel} className="text-xs px-4 py-2 rounded-xl border"
                          style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>Cancelar</button>
                        <button onClick={() => save(c.id)} disabled={!!saving}
                          className="text-xs font-semibold px-4 py-2 rounded-xl"
                          style={{ background: 'var(--pf-coral)', color: '#fff', opacity: saving === c.id ? .7 : 1 }}>
                          {saving === c.id ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-xl p-3 border" style={{ borderColor: 'var(--pf-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Plan</p>
                        <p className="font-bold text-sm mt-0.5" style={{ color: plan.color }}>{plan.label}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border" style={{ borderColor: 'var(--pf-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Estado</p>
                        <p className="font-bold text-sm mt-0.5" style={{ color: status.color }}>{status.label}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border" style={{ borderColor: 'var(--pf-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Pacientes</p>
                        <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--pf-ink)' }}>
                          {c.max_patients >= 999 ? '∞' : c.max_patients}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Usuarios de la clínica */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--pf-muted)' }}>
                    Usuarios ({c.users.length})
                  </p>
                  {c.users.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Sin usuarios asignados</p>
                  ) : (
                    <div className="space-y-2">
                      {c.users.map(u => {
                        const roleInfo = ROLES.find(r => r.value === u.role) ?? ROLES[1]
                        return (
                          <div key={u.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border"
                            style={{ borderColor: 'var(--pf-border)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: roleInfo.color + '18', color: roleInfo.color }}>
                              {u.full_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--pf-ink)' }}>{u.full_name}</p>
                              <p className="text-xs truncate" style={{ color: 'var(--pf-muted)' }}>{u.email}</p>
                            </div>
                            {/* Cambiar rol */}
                            <select value={u.role} onChange={e => updateUserRole(u.id, c.id, e.target.value)}
                              className="text-xs border rounded-xl px-2 py-1.5 outline-none flex-shrink-0"
                              style={{ borderColor: 'var(--pf-border)', color: roleInfo.color, fontWeight: 600 }}>
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            {/* Quitar acceso */}
                            <button onClick={() => removeUser(u.id, c.id)}
                              className="text-xs px-2 py-1.5 rounded-xl flex-shrink-0"
                              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Stripe */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--pf-muted)' }}>Stripe</p>
                  <div className="bg-white rounded-xl px-4 py-3 border flex items-center justify-between"
                    style={{ borderColor: 'var(--pf-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>Customer ID</span>
                    <span className="text-xs font-mono" style={{ color: c.stripe_customer_id ? 'var(--pf-ink)' : 'var(--pf-muted)' }}>
                      {c.stripe_customer_id || '—'}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
