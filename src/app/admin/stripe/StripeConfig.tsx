'use client'

import { useState } from 'react'

export default function StripeConfig({
  hasSecretKey,
  hasPublicKey,
}: {
  hasSecretKey: boolean
  hasPublicKey: boolean
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [secretKey, setSecretKey]   = useState('')
  const [publicKey, setPublicKey]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/stripe-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey, publicKey }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('✓ Claves guardadas. Reinicia el servidor para aplicarlas.')
      setMode('view')
      setSecretKey('')
      setPublicKey('')
    } else {
      setMsg('Error: ' + (data.error ?? 'No se pudieron guardar las claves'))
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border p-6 mb-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          🔧 Configurar claves de API
        </h3>
        {mode === 'view' && (
          <button onClick={() => setMode('edit')}
            className="text-xs font-medium px-4 py-2 rounded-xl border transition"
            style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
            {hasSecretKey && hasPublicKey ? 'Actualizar claves' : 'Añadir claves'}
          </button>
        )}
      </div>

      {mode === 'view' ? (
        <div className="space-y-3">
          <InfoRow label="Secret Key"      value={hasSecretKey ? 'sk_••••••••••••••••' : 'No configurada'} ok={hasSecretKey} />
          <InfoRow label="Publishable Key" value={hasPublicKey  ? 'pk_••••••••••••••••' : 'No configurada'} ok={hasPublicKey}  />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Secret Key <span style={{ color: 'var(--muted)' }}>(sk_live_... o sk_test_...)</span>
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="sk_live_..."
              className="w-full px-4 py-2.5 text-sm border rounded-xl outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Publishable Key <span style={{ color: 'var(--muted)' }}>(pk_live_... o pk_test_...)</span>
            </label>
            <input
              type="text"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
              placeholder="pk_live_..."
              className="w-full px-4 py-2.5 text-sm border rounded-xl outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {msg && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: msg.startsWith('✓') ? '#edfaf1' : '#fee2e2', color: msg.startsWith('✓') ? '#1a7a3c' : '#dc2626' }}>
              {msg}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving || (!secretKey && !publicKey)}
              className="btn-pf text-sm px-5 py-2.5 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar claves'}
            </button>
            <button onClick={() => { setMode('view'); setSecretKey(''); setPublicKey(''); setMsg('') }}
              className="text-sm px-4 py-2.5 rounded-xl border transition"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{label}</span>
      <span className="text-xs font-mono" style={{ color: ok ? 'var(--muted)' : '#dc2626' }}>{value}</span>
    </div>
  )
}
