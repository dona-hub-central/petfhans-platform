'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/vet/dashboard',     icon: '🏠', label: 'Inicio' },
  { href: '/vet/appointments',  icon: '📅', label: 'Citas' },
  { href: '/vet/pets',          icon: '🐾', label: 'Mascotas' },
  { href: '/vet/records',       icon: '📋', label: 'Consultas' },
  { href: '/vet/invitations',   icon: '📨', label: 'Invitaciones' },
  { href: '/vet/ai',            icon: '🤖', label: 'IA Clínica' },
  { href: '/vet/team',          icon: '👥', label: 'Equipo' },
  { href: '/vet/billing',       icon: '💳', label: 'Facturación' },
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
      <aside className="w-56 bg-white border-r flex flex-col fixed h-full z-10"
        style={{ borderColor: 'var(--pf-border)' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'var(--pf-coral-soft)' }}>🐾</div>
            <div>
              <p className="font-bold text-xs leading-tight" style={{ color: 'var(--pf-ink)' }}>Petfhans</p>
              <p className="text-xs leading-tight truncate max-w-[100px]" style={{ color: 'var(--pf-muted)' }}>{clinicName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(item => {
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition font-medium"
                style={{
                  background: active ? 'var(--pf-coral-soft)' : 'transparent',
                  color: active ? 'var(--pf-coral)' : 'var(--pf-muted)',
                }}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Patient usage indicator */}
        {usage && (
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs" style={{ color: 'var(--pf-muted)' }}>Pacientes</span>
              <span className="text-xs font-semibold" style={{ color: usageColor }}>
                {usage.count}/{usage.max}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pf-bg)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${usagePct}%`, background: usageColor }} />
            </div>
          </div>
        )}

        {/* User */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--pf-border)' }}>
          <Link href="/vet/profile" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
              {userName[0]}
            </div>
            <span className="text-xs truncate max-w-[100px] group-hover:underline"
              style={{ color: 'var(--pf-ink)' }}>
              {userName}
            </span>
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-56 p-8">
        {children}
      </main>
    </div>
  )
}
