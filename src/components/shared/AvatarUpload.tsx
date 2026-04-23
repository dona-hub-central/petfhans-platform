'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

export default function AvatarUpload({
  currentUrl,
  name,
  size = 80,
}: {
  currentUrl?: string | null
  name?: string
  size?: number
}) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/profile/upload-avatar', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setUrl(data.avatar_url)
    } else {
      setError(data.error ?? 'Error al subir imagen')
    }
    setUploading(false)
  }

  const badge = Math.round(size * 0.34)
  const iconSize = Math.round(size * 0.16)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Cambiar foto de perfil"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        style={{ position: 'relative', width: size, height: size, cursor: uploading ? 'default' : 'pointer' }}
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: url ? 'transparent' : 'var(--pf-coral-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          border: '3px solid white',
          boxShadow: '0 2px 12px rgba(0,0,0,.1)',
          opacity: uploading ? 0.6 : 1,
          transition: 'opacity 0.2s',
          color: 'var(--pf-coral)',
          fontFamily: 'var(--pf-font-display)',
          fontSize: size * 0.38,
          fontWeight: 700,
        }}>
          {url
            ? <img src={url} alt={name ?? 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (name?.[0]?.toUpperCase() ?? '?')
          }
        </div>
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: badge, height: badge, borderRadius: '50%',
          background: uploading ? 'var(--pf-muted)' : 'var(--pf-coral)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid white',
          transition: 'background 0.2s',
        }}>
          <Camera size={iconSize} strokeWidth={2.5} />
        </div>
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--pf-coral)', margin: 0, textAlign: 'center', maxWidth: 160 }}>{error}</p>}
    </div>
  )
}
