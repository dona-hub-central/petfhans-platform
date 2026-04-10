'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewClinicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  const [clinic, setClinic] = useState({
    name: '',
    slug: '',
    subscription_plan: 'trial',
    max_patients: 50,
  })

  const [admin, setAdmin] = useState({
    full_name: '',
    email: '',
    password: '',
  })

  const generateSlug = (name: string) =>
    name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  const handleClinicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setClinic(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // 1. Crear la clínica
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: clinic.name,
          slug: clinic.slug,
          subscription_plan: clinic.subscription_plan,
          subscription_status: 'trial',
          max_patients: Number(clinic.max_patients),
        })
        .select()
        .single()

      if (clinicError) throw new Error(clinicError.message)

      // 2. Crear usuario vet_admin vía API route
      const res = await fetch('/api/admin/create-vet-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinicData.id,
          ...admin,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Error creando admin')

      // 3. Actualizar owner_id en la clínica
      await supabase
        .from('clinics')
        .update({ owner_id: result.user_id })
        .eq('id', clinicData.id)

      router.push(`/admin/clinics/${clinicData.id}?created=true`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-8">
        {/* Header */}
        <div className="mb-8">
          <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Volver</a>
          <h1 className="text-2xl font-bold text-gray-800">Nueva clínica</h1>
          <p className="text-gray-500 text-sm mt-1">Configura el entorno veterinario</p>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            <StepDot active={step >= 1} done={step > 1} label="Clínica" />
            <div className="flex-1 h-px bg-gray-200" />
            <StepDot active={step >= 2} done={false} label="Administrador" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica</label>
                <input
                  name="name"
                  value={clinic.name}
                  onChange={handleClinicChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Clínica Veterinaria Sol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400">
                  <input
                    name="slug"
                    value={clinic.slug}
                    onChange={handleClinicChange}
                    required
                    className="flex-1 px-4 py-3 focus:outline-none"
                    placeholder="clinica-sol"
                  />
                  <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200">.petfhans.com</span>
                </div>
                {clinic.slug && (
                  <p className="text-xs text-emerald-600 mt-1">✓ {clinic.slug}.petfhans.com</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    name="subscription_plan"
                    value={clinic.subscription_plan}
                    onChange={handleClinicChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="trial">Trial (gratis)</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. pacientes</label>
                  <input
                    name="max_patients"
                    type="number"
                    value={clinic.max_patients}
                    onChange={handleClinicChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-emerald-50 rounded-lg p-4 mb-2">
                <p className="text-sm text-emerald-700 font-medium">🏥 {clinic.name}</p>
                <p className="text-xs text-emerald-600">{clinic.slug}.petfhans.com · Plan {clinic.subscription_plan}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del administrador</label>
                <input
                  value={admin.full_name}
                  onChange={e => setAdmin(p => ({ ...p, full_name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Dr. Juan García"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={admin.email}
                  onChange={e => setAdmin(p => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="dr.garcia@clinicasol.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal</label>
                <input
                  type="password"
                  value={admin.password}
                  onChange={e => setAdmin(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="mínimo 8 caracteres"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Atrás
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creando...' : step === 1 ? 'Siguiente →' : '✓ Crear clínica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
        done ? 'bg-emerald-500 text-white' :
        active ? 'bg-emerald-500 text-white' :
        'bg-gray-200 text-gray-400'
      }`}>
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <span className={`text-xs ${active ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}
