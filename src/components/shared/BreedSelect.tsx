'use client'

import { useState, useRef, useEffect } from 'react'

const BREEDS: Record<string, string[]> = {
  dog: [
    'Akita Inu','Alaskan Malamute','American Bully','American Staffordshire Terrier',
    'Beagle','Bichón Frisé','Border Collie','Boston Terrier','Boxer',
    'Braco Alemán','Bulldog Francés','Bulldog Inglés','Bullmastiff',
    'Caniche (Poodle)','Cane Corso','Cavalier King Charles Spaniel',
    'Chihuahua','Chow Chow','Cocker Spaniel Inglés','Cocker Spaniel Americano',
    'Collie','Dachshund (Teckel)','Dálmata','Doberman','Dogo Argentino',
    'Dogo de Burdeos','English Setter','Fila Brasileiro','Fox Terrier',
    'Golden Retriever','Gran Danés','Greyhound','Husky Siberiano',
    'Jack Russell Terrier','Labrador Retriever','Lhasa Apso','Lobero Irlandés',
    'Maltes','Mastín Español','Mastín Napolitano','Mestizo','Mops (Pug)',
    'Pastor Alemán','Pastor Australiano','Pastor Belga Malinois','Pastor de Berna',
    'Pastor Holandés','Pekinés','Pequinés','Perro de Agua Español',
    'Perro Sin Pelo del Perú','Pinscher Miniatura','Pit Bull Terrier',
    'Pointer','Rottweiler','Rough Collie','Saluki','Samoyedo',
    'Schnauzer Gigante','Schnauzer Mediano','Schnauzer Miniatura','Setter Irlandés',
    'Shar Pei','Shiba Inu','Shih Tzu','Springer Spaniel','Staffordshire Bull Terrier',
    'Terranova','Weimaraner','West Highland White Terrier','Whippet',
    'Yorkshire Terrier','Otro',
  ],
  cat: [
    'Abisinio','American Shorthair','Angora Turco','Azul Ruso','Bengalí',
    'Birmano','Bosque de Noruega','British Longhair','British Shorthair',
    'Burmés','Cornish Rex','Devon Rex','Esfinge (Sphynx)','Exótico de Pelo Corto',
    'Maine Coon','Manx','Mau Egipcio','Mestizo','Neva Masquerade','Ocicat',
    'Persa','Ragdoll','Rex Alemán','Sagrado de Birmania','Scottish Fold',
    'Siamés','Siberiano','Singapura','Somalí','Tonkinés','Van Turco',
    'Europeo Común','Otro',
  ],
  bird: [
    'Agapornis (Inseparable)','Cacatúa Alba','Cacatúa Galerita','Canario',
    'Caturra (Agapornis)','Cotorra Argentina','Diamante de Gould',
    'Eclectus','Guacamayo Azul y Amarillo','Guacamayo Rojo',
    'Jilguero','Loro Gris Africano','Loro Yaco','Ninfas (Cockatiel)',
    'Ñandú','Paloma','Papagayo Senegalés','Periquito Australiano',
    'Periquito Inglés','Pichón','Pinzón','Rosella','Tórtola',
    'Tucán','Otro',
  ],
  rabbit: [
    'American','Angora Inglés','Angora Francés','Belier','Belier Miniatura',
    'California','Dutch (Holandés)','Enano de Hotot','Gigante de Flandes',
    'Leonado de Borgoña','Lionhead (León)','Lop Inglés','Lop Francés',
    'Mini Lop','Mini Rex','Nueva Zelanda','Punto Inglés','Rex',
    'Satén','Teddy','Mestizo','Otro',
  ],
  other: ['Erizo','Hurón','Chinchilla','Cobaya (Cuy)','Hámster','Rata','Ratón','Tortuga','Iguana','Serpiente','Lagarto','Pez','Otro'],
}

export default function BreedSelect({
  species, value, onChange
}: {
  species: string; value: string; onChange: (v: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const breeds = BREEDS[species] ?? []
  const filtered = query.length === 0
    ? breeds
    : breeds.filter(b => b.toLowerCase().includes(query.toLowerCase()))

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sincronizar query cuando cambia species
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setQuery(''); onChange('') }, [species])

  const select = (breed: string) => {
    setQuery(breed); onChange(breed); setOpen(false)
  }

  const inpS = {
    borderColor: 'var(--pf-border)', color: 'var(--pf-ink)',
    background: '#fff',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={breeds.length ? 'Buscar raza…' : 'Selecciona especie primero'}
        disabled={!breeds.length}
        className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition"
        style={inpS}
        onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--pf-border)'}
        onKeyDown={(e: any) => { e.target.style.borderColor = 'var(--pf-coral)' }}
      />

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--pf-border)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 4,
          maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.map(breed => (
            <div key={breed}
              onMouseDown={() => select(breed)}
              style={{
                padding: '10px 16px', fontSize: 14, cursor: 'pointer',
                color: breed === value ? 'var(--pf-coral)' : 'var(--pf-ink)',
                background: breed === value ? 'var(--pf-coral-soft)' : 'transparent',
                fontWeight: breed === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (breed !== value) (e.currentTarget as HTMLElement).style.background = 'var(--pf-bg)' }}
              onMouseLeave={e => { if (breed !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              {breed}
            </div>
          ))}
        </div>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--pf-border)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 4,
          padding: '12px 16px', fontSize: 13, color: 'var(--pf-muted)',
        }}>
          No se encontró "{query}" — se guardará como texto libre
        </div>
      )}
    </div>
  )
}
