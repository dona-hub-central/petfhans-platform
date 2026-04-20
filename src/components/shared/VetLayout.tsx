'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

function Icon({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'home')       return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
  if (name === 'calendar')   return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  if (name === 'paw')        return <svg {...common}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 20a4 4 0 0 1 8 0"/></svg>
  if (name === 'clipboard')  return <svg {...common}><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg>
  if (name === 'mail')       return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
  if (name === 'sparkles')   return <svg {...common}><path d="m12 3-1.9 5.8L4 10l5.8 1.9L11.9 18l1.9-5.8L20 10.3l-5.8-1.9z"/></svg>
  if (name === 'users')      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  if (name === 'card')       return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
  return null
}

const nav = [
  { href: '/vet/dashboard',    icon: 'home',      label: 'Inicio' },
  { href: '/vet/appointments', icon: 'calendar',  label: 'Citas' },
  { href: '/vet/pets',         icon: 'paw',       label: 'Mascotas' },
  { href: '/vet/records',      icon: 'clipboard', label: 'Consultas' },
  { href: '/vet/invitations',  icon: 'mail',      label: 'Invitaciones' },
  { href: '/vet/ai',           icon: 'sparkles',  label: 'IA Clínica', tint: 'purple' },
  { href: '/vet/team',         icon: 'users',     label: 'Equipo' },
  { href: '/vet/billing',      icon: 'card',      label: 'Facturación' },
]

export default function VetLayout({
  children,
  clinicName,
  userName,
}: {
  children: React.ReactNode
  clinicName: string
  userName: string
}) {
  const path = usePathname()
  const [usage, setUsage] = useState<{ count: number; max: number } | null>(null)

  useEffect(() => {
    fetch('/api/vet/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUsage(d) })
      .catch(() => null)
  }, [])

  const usagePct   = usage && usage.max > 0 ? Math.min((usage.count / usage.max) * 100, 100) : 0
  const usageColor = usagePct >= 100 ? '#dc2626' : usagePct >= 80 ? '#d97706' : 'var(--pf-coral)'

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--pf-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--pf-white)',
        borderRight: '0.5px solid var(--pf-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '18px 16px', borderBottom: '0.5px solid var(--pf-border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 100 100">
              <ellipse cx="50" cy="62" rx="16" ry="13" fill="#fff"/>
              <ellipse cx="31" cy="48" rx="8" ry="10" fill="#fff"/>
              <ellipse cx="44" cy="40" rx="8" ry="10" fill="#fff"/>
              <ellipse cx="57" cy="40" rx="8" ry="10" fill="#fff"/>
              <ellipse cx="70" cy="48" rx="8" ry="10" fill="#fff"/>
            </svg>
          </div>
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pf-ink)' }}>Petfhans</div>
            <div style={{ fontSize: 11, color: 'var(--pf-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{clinicName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const active = path.startsWith(item.href)
            const color = active ? (item.tint === 'purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)') : 'var(--pf-muted)'
            const bg    = active ? (item.tint === 'purple' ? 'var(--pf-info)'    : 'var(--pf-coral-soft)') : 'transparent'
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10,
                fontSize: 13, fontWeight: active ? 500 : 400,
                textDecoration: 'none', transition: 'background 0.15s',
                background: bg, color,
              }}>
                <Icon name={item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Patient usage indicator */}
        {usage && (
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--pf-muted)' }}>Pacientes</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: usageColor }}>
                {usage.count}/{usage.max}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--pf-bg)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: `${usagePct}%`, height: '100%', background: usageColor, borderRadius: 100, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* User */}
        <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '14px 16px' }}>
          <Link href="/vet/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {userName[0]}
            </div>
            <span style={{ fontSize: 13, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {userName}
            </span>
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, marginLeft: 220, padding: 32 }}>
        {children}
      </main>
    </div>
  )
}
