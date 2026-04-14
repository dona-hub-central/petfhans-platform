'use client'

import { useState, useRef, useEffect } from 'react'

const SPECIES_ICON: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

type Pet = { id: string; name: string; species: string; breed: string | null }

export default function PetSearch({
  pets, value, onChange
}: {
  pets: Pet[]; value: string; onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = pets.find(p => p.id === value)
  const filtered = query.length === 0
    ? pets
    : pets.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.breed ?? '').toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (pet: Pet) => {
    onChange(pet.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Input principal */}
      <div
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition cursor-pointer flex items-center gap-2"
        style={{ borderColor: open ? 'var(--accent)' : 'var(--border)', background: '#fff', minHeight: 46 }}>
        {selected ? (
          <>
            <span>{SPECIES_ICON[selected.species]}</span>
            <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{selected.name}</span>
            {selected.breed && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.breed}</span>}
            <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }}
              style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Seleccionar mascota…</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 4,
        }}>
          {/* Buscador */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre o raza…"
              style={{
                width: '100%', border: 'none', background: 'var(--bg)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
                boxSizing: 'border-box',
              }} />
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                No se encontró ninguna mascota
              </p>
            ) : filtered.map(pet => (
              <div key={pet.id}
                onMouseDown={() => select(pet)}
                style={{
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  background: pet.id === value ? 'var(--accent-s)' : 'transparent',
                }}
                onMouseEnter={e => { if (pet.id !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (pet.id !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ fontSize: 18 }}>{SPECIES_ICON[pet.species]}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: pet.id === value ? 'var(--accent)' : 'var(--text)', margin: 0 }}>
                    {pet.name}
                  </p>
                  {pet.breed && <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{pet.breed}</p>}
                </div>
                {pet.id === value && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
