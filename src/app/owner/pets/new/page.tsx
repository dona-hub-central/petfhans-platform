'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PawPrint, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const SPECIES = [
  { value: 'dog',    label: 'Perro',   emoji: '🐕' },
  { value: 'cat',    label: 'Gato',    emoji: '🐈' },
  { value: 'bird',   label: 'Ave',     emoji: '🦜' },
  { value: 'rabbit', label: 'Conejo',  emoji: '🐇' },
  { value: 'other',  label: 'Otro',    emoji: '🐾' },
]

export default function NewPetPage() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [species, setSpecies] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const canSave = name.trim() !== '' && species !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setLoading(true); setError('')

    const res = await fetch('/api/owner/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), species }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al crear la mascota'); setLoading(false); return }
    router.push('/owner/dashboard')
  }

  const inp = 'w-full px-4 py-3 rounded-xl border outline-none transition'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', fontSize: 16 as const }

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--pf-bg)', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <style>{`.species-grid{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}@media(min-width:420px){.species-grid{grid-template-columns:repeat(5,1fr)}}`}</style>
      <div className="max-w-md mx-auto">

        <Link href="/owner/dashboard"
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--pf-muted)', textDecoration: 'none' }}>
          <ChevronLeft size={16} strokeWidth={2} /> Volver
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'var(--pf-coral-soft)' }}>
              <PawPrint size={28} strokeWidth={1.5} style={{ color: 'var(--pf-coral)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>Nueva mascota</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
              Registra a tu compañero
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--pf-ink)' }}>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} required
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

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !canSave} className="btn-pf w-full py-3 text-sm">
              {loading ? 'Guardando...' : 'Guardar mascota'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
