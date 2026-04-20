'use client'

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(text)}
      className="text-xs px-3 py-1.5 rounded-lg border transition flex-shrink-0"
      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
      Copiar
    </button>
  )
}
