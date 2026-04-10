'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewClinicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  const [clinic, setClinic] = useState({ name: '', slug: '', subscription_plan: 'trial', max_patients: 50 })
  const [admin, setAdmin] = useState({ full_name: '', email: '', password: '' })

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  const handleClinicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setClinic(prev => ({ ...prev, [name]: value, ...(name === 'name' ? { slug: generateSlug(value) } : {}) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setLoading(true); setError('')

    try {
      const supabase = createClient()
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({ name: clinic.name, slug: clinic.slug, subscription_plan: clinic.subscription_plan, subscription_status: 'trial', max_patients: Number(clinic.max_patients) })
        .select().single()

      if (clinicError) throw new Error(clinicError.message)

      const res = await fetch('/api/admin/create-vet-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicData.id, ...admin }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Error creando admin')

      await supabase.from('clinics').update({ owner_id: result.user_id }).eq('id', clinicData.id)
      router.push(`/admin/clinics/${clinicData.id}?created=true`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text)', background: '#fff' }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--border)' }}>
          <a href="/admin" className="text-xs mb-6 inline-block" style={{ color: 'var(--muted)' }}>← Volver</a>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Nueva clínica</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Configura el entorno veterinario</p>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            <Step n={1} active={step >= 1} done={step > 1} label="Clínica" />
            <div className="flex-1 h-px" style={{ background: step > 1 ? 'var(--accent)' : 'var(--border)' }} />
            <Step n={2} active={step >= 2} done={false} label="Administrador" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Nombre de la clínica</label>
                  <input name="name" value={clinic.name} onChange={handleClinicChange} required
                    className={inputClass} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    placeholder="Clínica Veterinaria Sol" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Subdominio</label>
                  <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <input name="slug" value={clinic.slug} onChange={handleClinicChange} required
                      className="flex-1 px-4 py-3 text-sm outline-none" style={{ color: 'var(--text)' }}
                      placeholder="clinica-sol" />
                    <span className="px-3 py-3 text-xs border-l" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--bg)' }}>
                      .petfhans.com
                    </span>
                  </div>
                  {clinic.slug && <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>✓ {clinic.slug}.petfhans.com</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Plan</label>
                    <select name="subscription_plan" value={clinic.subscription_plan} onChange={handleClinicChange}
                      className={inputClass} style={inputStyle}>
                      <option value="trial">Trial (gratis)</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>Máx. pacientes</label>
                    <input name="max_patients" type="number" value={clinic.max_patients} onChange={handleClinicChange}
                      className={inputClass} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="rounded-xl p-4 mb-2" style={{ background: 'var(--accent-s)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>🏥 {clinic.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--accent-h)' }}>{clinic.slug}.petfhans.com · Plan {clinic.subscription_plan}</p>
                </div>
                {['full_name', 'email', 'password'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                      {field === 'full_name' ? 'Nombre del administrador' : field === 'email' ? 'Email' : 'Contraseña temporal'}
                    </label>
                    <input
                      type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                      value={(admin as any)[field]}
                      onChange={e => setAdmin(p => ({ ...p, [field]: e.target.value }))}
                      required minLength={field === 'password' ? 8 : undefined}
                      className={inputClass} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      placeholder={field === 'full_name' ? 'Dr. Juan García' : field === 'email' ? 'dr@clinica.com' : 'mínimo 8 caracteres'}
                    />
                  </div>
                ))}
              </>
            )}

            {error && <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--accent-s)', color: 'var(--accent-h)' }}>{error}</div>}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-3 text-sm font-semibold rounded-lg border transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  ← Atrás
                </button>
              )}
              <button type="submit" disabled={loading} className="btn-pf flex-1 py-3 text-sm">
                {loading ? 'Creando...' : step === 1 ? 'Siguiente →' : '✓ Crear clínica'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Step({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition"
        style={{
          background: active ? 'var(--accent)' : 'var(--border)',
          color: active ? '#fff' : 'var(--muted)',
        }}>
        {done ? '✓' : n}
      </div>
      <span className="text-xs" style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>{label}</span>
    </div>
  )
}
