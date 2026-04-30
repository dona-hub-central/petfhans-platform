'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '¡Buenos días!'
  if (hour < 20) return '¡Buenas tardes!'
  return '¡Buenas noches!'
}

export default function GreetingHeader({ name }: { name: string }) {
  const firstName = name?.split(' ')[0] ?? 'tú'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <p style={{
          fontFamily: 'var(--pf-font-body)',
          fontSize: 13, fontWeight: 600, color: 'var(--pf-muted)',
          textTransform: 'uppercase', letterSpacing: '.07em', margin: 0,
        }}>
          {getGreeting()}
        </p>
        <h1 style={{
          fontFamily: 'var(--pf-font-display)',
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em',
          color: 'var(--pf-ink)', margin: '4px 0 0',
        }}>
          Hola, {firstName}
        </h1>
      </div>

      <Link
        href="/owner/settings"
        aria-label="Configuración de cuenta"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--pf-surface)',
          border: '0.5px solid var(--pf-border)',
          color: 'var(--pf-muted)',
          textDecoration: 'none',
          flexShrink: 0,
          marginTop: 4,
          transition: 'background .15s, color .15s',
        }}
      >
        <Settings size={18} strokeWidth={1.75} />
      </Link>
    </div>
  )
}
