'use client'

import { useState } from 'react'

type PetFile = {
  id: string
  file_name: string
  file_type: string
  file_size: number | null
  mime_type: string | null
  notes: string | null
  created_at: string
  uploader?: string
}

const FILE_TYPES = [
  { value: 'prescription', label: '💊 Receta',   color: '#7c3aed' },
  { value: 'exam',         label: '🔬 Examen',   color: '#2563eb' },
  { value: 'photo',        label: '📷 Foto',     color: '#16a34a' },
  { value: 'video',        label: '🎥 Vídeo',    color: '#dc2626' },
  { value: 'other',        label: '📎 Otro',     color: '#64748b' },
]

const ACCEPT = 'image/*,application/pdf,video/*,.doc,.docx'

function fileIcon(mime: string | null) {
  if (!mime) return '📎'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('video/')) return '🎥'
  return '📎'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function PetFiles({
  petId,
  initialFiles,
  canUpload = true,
  canDelete = false,
}: {
  petId: string
  initialFiles: PetFile[]
  canUpload?: boolean
  canDelete?: boolean
}) {
  const [files, setFiles] = useState(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ file_type: 'prescription', notes: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) { setError('Selecciona un archivo'); return }
    setUploading(true); setError('')

    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('pet_id', petId)
    fd.append('file_type', form.file_type)
    fd.append('notes', form.notes)

    let res: Response, data: any
    try {
      res = await fetch('/api/files/upload', { method: 'POST', body: fd, credentials: 'include' })
      const text = await res.text()
      try { data = JSON.parse(text) } catch { data = { error: `Respuesta inesperada (${res.status}): ${text.slice(0, 120)}` } }
    } catch (fetchErr: any) {
      setError('Error de red: ' + fetchErr.message)
      setUploading(false); return
    }
    if (!res!.ok) { setError(data.error || `Error ${res!.status} al subir`); setUploading(false); return }

    setFiles(prev => [data.file, ...prev])
    setShowForm(false)
    setSelectedFile(null)
    setForm({ file_type: 'prescription', notes: '' })
    setUploading(false)
  }

  const openFile = async (fileId: string) => {
    setOpeningId(fileId)
    const res = await fetch(`/api/files/${fileId}`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    setOpeningId(null)
  }

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`¿Eliminar "${fileName}"?`)) return
    await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--pf-border)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--pf-ink)' }}>
          📎 Archivos y documentos
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--pf-bg)', color: 'var(--pf-muted)' }}>
            {files.length}
          </span>
          {canUpload && (
            <button onClick={() => setShowForm(!showForm)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              style={{ background: 'var(--pf-coral)', color: '#fff' }}>
              + Añadir
            </button>
          )}
        </div>
      </div>

      {/* Formulario subida */}
      {showForm && (
        <form onSubmit={handleUpload} className="px-6 py-5 border-b" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--pf-ink)' }}>Tipo</label>
              <select value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}
                className="w-full text-sm border rounded-xl px-3 py-2 outline-none"
                style={{ borderColor: 'var(--pf-border)', background: '#fff' }}>
                {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--pf-ink)' }}>Archivo</label>
              <input type="file" accept={ACCEPT} required
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs border rounded-xl px-3 py-2 outline-none"
                style={{ borderColor: 'var(--pf-border)', background: '#fff' }} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--pf-ink)' }}>Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Radiografía cadera, control 3 meses..."
              className="w-full text-sm border rounded-xl px-3 py-2 outline-none"
              style={{ borderColor: 'var(--pf-border)', background: '#fff' }} />
          </div>
          {error && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={uploading}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
              style={{ background: 'var(--pf-coral)', color: '#fff' }}>
              {uploading ? 'Subiendo...' : 'Subir archivo'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-xs px-4 py-2 rounded-xl border transition"
              style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de archivos */}
      <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
        {files.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>Sin archivos adjuntos</p>
            {canUpload && (
              <button onClick={() => setShowForm(true)}
                className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--pf-coral)' }}>
                Añadir el primero →
              </button>
            )}
          </div>
        ) : files.map((f) => {
          const ft = FILE_TYPES.find(t => t.value === f.file_type) ?? FILE_TYPES[4]
          return (
            <div key={f.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition">
              <span className="text-2xl flex-shrink-0">{fileIcon(f.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--pf-ink)' }}>{f.file_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: ft.color + '18', color: ft.color }}>
                    {ft.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {f.notes && <p className="text-xs truncate" style={{ color: 'var(--pf-muted)' }}>{f.notes}</p>}
                  {f.file_size && <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>{formatSize(f.file_size)}</span>}
                  <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>
                    {new Date(f.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openFile(f.id)} disabled={openingId === f.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl transition"
                  style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                  {openingId === f.id ? '...' : 'Abrir'}
                </button>
                {canDelete && (
                  <button onClick={() => deleteFile(f.id, f.file_name)}
                    className="text-xs px-2.5 py-1.5 rounded-xl transition"
                    style={{ background: '#fee2e2', color: '#dc2626' }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
