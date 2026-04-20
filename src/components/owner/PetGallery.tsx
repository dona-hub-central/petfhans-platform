'use client'

import { useState, useRef } from 'react'

type GalleryPhoto = {
  id: string
  file_name: string
  file_path: string
  notes: string | null
  created_at: string
  publicUrl?: string
}

export default function PetGallery({
  petId,
  initialPhotos,
}: {
  petId: string
  initialPhotos: GalleryPhoto[]
}) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const fd = new FormData()
      fd.append('file', file)
      fd.append('pet_id', petId)
      fd.append('file_type', 'photo')
      fd.append('notes', '')
      try {
        const res = await fetch('/api/files/upload', { method: 'POST', body: fd, credentials: 'include' })
        const data = await res.json()
        if (res.ok && data.file) {
          // Obtener URL pública
          const urlRes = await fetch(`/api/files/${data.file.id}`)
          const urlData = await urlRes.json()
          setPhotos(prev => [{ ...data.file, publicUrl: urlData.url }, ...prev])
        }
      } catch (_) {}
    }
    setUploading(false)
  }

  return (
    <div>
      {/* Header galería */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--pf-ink)' }}>
          Galería · {photos.length} fotos
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'var(--pf-coral)', color: '#fff',
            border: 'none', borderRadius: 20, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
          {uploading ? '⏳' : '+'} {uploading ? 'Subiendo…' : 'Añadir'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Grid galería */}
      {photos.length === 0 ? (
        <button onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', border: '2px dashed var(--pf-border)',
            borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            background: 'var(--pf-bg)', cursor: 'pointer',
          }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📷</p>
          <p style={{ fontSize: 14, color: 'var(--pf-muted)' }}>Añade fotos de {' '}tu mascota</p>
        </button>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {photos.map((p, i) => (
            <div key={p.id} onClick={() => setLightbox(p.publicUrl || '')}
              style={{
                aspectRatio: '1',
                background: '#f0f0f0',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: i === 0 ? '16px 0 0 0' : i === 2 ? '0 16px 0 0' : 0,
              }}>
              {p.publicUrl ? (
                <img src={p.publicUrl} alt={p.notes || p.file_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 24 }}>
                  🖼️
                </div>
              )}
              {p.notes && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,.5))',
                  padding: '12px 6px 4px', fontSize: 10, color: '#fff',
                }}>
                  {p.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
          <button onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,.15)', border: 'none',
              borderRadius: '50%', width: 36, height: 36,
              color: '#fff', fontSize: 18, cursor: 'pointer',
            }}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
