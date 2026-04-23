'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PawPrint, Building2, ChevronRight, Check } from 'lucide-react'

const SPECIES = [
  { value: 'dog',    label: 'Perro',   emoji: '🐕' },
  { value: 'cat',    label: 'Gato',    emoji: '🐈' },
  { value: 'bird',   label: 'Ave',     emoji: '🦜' },
  { value: 'rabbit', label: 'Conejo',  emoji: '🐇' },
  { value: 'other',  label: 'Otro',    emoji: '🐾' },
]

export default function OwnerSetupPage() {
  const router = useRouter()
  const [step, setStep]           = useState<'pet' | 'clinic' | 'done'>('pet')
  const [hasPet, setHasPet]       = useState<boolean | null>(null)
  const [petName, setPetName]     = useState('')
  const [species, setSpecies]     = useState('')
  const [clinicSlug, setClinicSlug] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const finish = async (skipClinic = false) => {
    setLoading(true); setError('')
    const res = await fetch('/api/owner/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_slug: skipClinic ? '' : clinicSlug.trim(),
        pet_name:    hasPet ? petName : '',
        pet_species: hasPet ? species : '',
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); setLoading(false); return }
    router.push('/owner/dashboard')
  }

  const inp = 'w-full px-4 py-3 rounded-xl border outline-none transition'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', fontSize: 16 as const }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--pf-bg)' }}>
      <style>{`.species-grid{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}@media(min-width:420px){.species-grid{grid-template-columns:repeat(5,1fr)}}`}</style>
      <div className="w-full max-w-md">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {['pet', 'clinic'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: step === s ? 'var(--pf-coral)' : (i === 0 && step === 'clinic') ? '#edfaf1' : 'var(--pf-bg)',
                  color: step === s ? '#fff' : (i === 0 && step === 'clinic') ? '#1a7a3c' : 'var(--pf-muted)',
                  border: `1.5px solid ${step === s ? 'var(--pf-coral)' : (i === 0 && step === 'clinic') ? '#b2f0c9' : 'var(--pf-border)'}`,
                }}>
                {i === 0 && step === 'clinic' ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              {i === 0 && <div className="w-10 h-0.5" style={{ background: 'var(--pf-border)' }} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>

          {/* STEP 1: ¿Tienes mascota? */}
          {step === 'pet' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                  style={{ background: 'var(--pf-coral-soft)' }}>
                  <PawPrint size={28} strokeWidth={1.5} style={{ color: 'var(--pf-coral)' }} />
                </div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>¿Tienes mascotas?</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
                  Puedes agregarlas ahora o más tarde desde el inicio
                </p>
              </div>

              {hasPet === null && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setHasPet(true)}
                    className="py-4 rounded-xl border-2 font-semibold text-sm transition"
                    style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-coral)'; (e.currentTarget as HTMLElement).style.color = 'var(--pf-coral)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--pf-ink)' }}>
                    Sí, tengo mascotas
                  </button>
                  <button onClick={() => { setHasPet(false); setStep('clinic') }}
                    className="py-4 rounded-xl border-2 font-semibold text-sm transition"
                    style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--pf-muted)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pf-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--pf-ink)' }}>
                    Por ahora no
                  </button>
                </div>
              )}

              {hasPet && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Nombre</label>
                    <input value={petName} onChange={e => setPetName(e.target.value)}
                      className={inp} style={inpStyle} placeholder="Luna, Max, Coco..."
                      onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                      onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Especie</label>
                    <div className="species-grid">
                      {SPECIES.map(s => (
                        <button key={s.value} type="button" onClick={() => setSpecies(s.value)}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border-2 transition"
                          style={{
                            borderColor: species === s.value ? 'var(--pf-coral)' : 'var(--pf-border)',
                            background:  species === s.value ? 'var(--pf-coral-soft)' : 'transparent',
                            color:       species === s.value ? 'var(--pf-coral)' : 'var(--pf-muted)',
                          }}>
                          <span className="text-lg">{s.emoji}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('clinic')}
                    disabled={!petName.trim() || !species}
                    className="btn-pf w-full py-3 text-sm flex items-center justify-center gap-2"
                    style={{ opacity: (!petName.trim() || !species) ? 0.5 : 1 }}>
                    Continuar <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* STEP 2: Código de clínica */}
          {step === 'clinic' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                  style={{ background: '#eff6ff' }}>
                  <Building2 size={28} strokeWidth={1.5} style={{ color: '#2563eb' }} />
                </div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>Conecta tu clínica</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
                  Opcional — puedes hacerlo después
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>
                    Código de clínica
                  </label>
                  <input value={clinicSlug} onChange={e => setClinicSlug(e.target.value)}
                    className={inp} style={inpStyle} placeholder="ej: clinica-mi-vet"
                    onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
                    onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--pf-muted)' }}>
                    Es el código que te da tu veterinaria. Lo encuentras en su enlace de invitación.
                  </p>
                </div>

                {error && (
                  <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                    {error}
                  </div>
                )}

                <button onClick={() => finish()} disabled={loading}
                  className="btn-pf w-full py-3 text-sm">
                  {loading ? 'Guardando...' : clinicSlug.trim() ? 'Conectar y entrar' : 'Entrar sin clínica'}
                </button>

                {clinicSlug.trim() && (
                  <button onClick={() => finish(true)} disabled={loading}
                    className="w-full py-2.5 text-sm font-medium"
                    style={{ color: 'var(--pf-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Saltar por ahora
                  </button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
