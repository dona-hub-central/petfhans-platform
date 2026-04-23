'use client'

import { useState, useRef } from 'react'

const SPECIES_ICON: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾'
}

export default function PetAvatar({
  petId,
  species,
  photoUrl,
  size = 80,
  editable = false,
  onUploaded,
}: {
  petId?: string
  species: string
  photoUrl?: string | null
  size?: number
  editable?: boolean
  onUploaded?: (url: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(photoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Solo imágenes'); return }
    setUploading(true); setError('')

    // Preview local inmediato
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('pet_id', petId || '')
    fd.append('file_type', 'photo')
    fd.append('notes', 'foto-perfil')

    try {
      const res = await fetch('/api/pets/upload-photo', {
        method: 'POST', body: fd, credentials: 'include'
      })
      const text = await res.text()
      type UploadResult = { photo_url?: string; error?: string }
      let data: UploadResult
      try { data = JSON.parse(text) as UploadResult } catch { data = { error: text.slice(0, 100) } }
      if (!res.ok) { setError(data.error || 'Error al subir'); setUploading(false); return }
      if (data.photo_url) {
        setPreview(data.photo_url)
        onUploaded?.(data.photo_url)
      }
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(false)
  }

  const radius = size * 0.2

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Avatar */}
      <div
        onClick={() => editable && inputRef.current?.click()}
        style={{
          width: size, height: size,
          borderRadius: radius,
          background: 'var(--pf-coral-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          cursor: editable ? 'pointer' : 'default',
          fontSize: size * 0.5,
          border: editable ? '2px dashed var(--pf-coral)' : 'none',
          position: 'relative',
        }}
        title={editable ? 'Cambiar foto' : undefined}
      >
        {preview ? (
          <img src={preview} alt="foto mascota"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{SPECIES_ICON[species] || '🐾'}</span>
        )}

        {/* Overlay editar */}
        {editable && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity .2s',
            borderRadius: radius,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
            <span style={{ color: '#fff', fontSize: size * 0.22 }}>
              {uploading ? '⏳' : '📷'}
            </span>
          </div>
        )}
      </div>

      {/* Input oculto */}
      {editable && (
        <input ref={inputRef} type="file" accept="image/*"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      )}

      {/* Error */}
      {error && (
        <p style={{ position: 'absolute', top: size + 4, left: 0, whiteSpace: 'nowrap',
          fontSize: 11, color: '#dc2626', background: '#fee2e2',
          padding: '2px 6px', borderRadius: 6 }}>
          {error}
        </p>
      )}
    </div>
  )
}
