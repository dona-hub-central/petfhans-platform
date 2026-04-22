'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Calendar, PawPrint, ClipboardList, Mail, Sparkles, Users, CreditCard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvailabilityToggle from '@/components/vet/AvailabilityToggle'

function LogoutSidebarButton() {
  const router = useRouter()
  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }
  return (
    <button onClick={logout} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 8, border: 'none',
      background: 'transparent', color: 'var(--pf-muted)',
      fontSize: 12, fontFamily: 'var(--pf-font-body)', cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff1f0'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--pf-muted)' }}
    >
      <LogOut size={13} strokeWidth={2} />
      Cerrar sesión
    </button>
  )
}

const nav = [
  { href: '/vet/dashboard',    Icon: Home,          label: 'Inicio' },
  { href: '/vet/appointments', Icon: Calendar,      label: 'Citas' },
  { href: '/vet/pets',         Icon: PawPrint,      label: 'Mascotas' },
  { href: '/vet/records',      Icon: ClipboardList, label: 'Consultas' },
  { href: '/vet/invitations',  Icon: Mail,          label: 'Invitaciones' },
  { href: '/vet/ai',           Icon: Sparkles,      label: 'IA Clínica', tint: 'purple' as const },
  { href: '/vet/team',         Icon: Users,         label: 'Equipo' },
  { href: '/vet/billing',      Icon: CreditCard,    label: 'Facturación' },
]

export default function VetLayout({
  children,
  clinicName,
  userName,
  avatarUrl,
  role,
}: {
  children: React.ReactNode
  clinicName: string
  userName: string
  avatarUrl?: string | null
  role?: string | null
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
  const usageColor = usagePct >= 100 ? 'var(--pf-danger-fg)' : usagePct >= 80 ? 'var(--pf-warning-fg)' : 'var(--pf-coral)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--pf-bg)' }}>
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
          <img src="/logo-icon.svg" width={32} height={32} alt="Petfhans" style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 13, color: 'var(--pf-ink)' }}>Petfhans</div>
            <div style={{ fontFamily: 'var(--pf-font-body)', fontSize: 11, color: 'var(--pf-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{clinicName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const active = path.startsWith(item.href)
            const color = active
              ? (item.tint === 'purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)')
              : 'var(--pf-muted)'
            const bg = active
              ? (item.tint === 'purple' ? 'var(--pf-info)' : 'var(--pf-coral-soft)')
              : 'transparent'
            return (
              <Link key={item.href} href={item.href}
                data-active={active ? 'true' : 'false'}
                className="pf-nav-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 10,
                  fontFamily: 'var(--pf-font-body)',
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  textDecoration: 'none', transition: 'background 0.15s',
                  background: bg, color,
                }}>
                <item.Icon size={16} strokeWidth={2} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Patient usage indicator */}
        {usage && (
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--pf-font-body)', fontSize: 12, color: 'var(--pf-muted)' }}>Pacientes</span>
              <span style={{ fontFamily: 'var(--pf-font-body)', fontSize: 12, fontWeight: 600, color: usageColor }}>
                {usage.count}/{usage.max}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--pf-bg)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: `${usagePct}%`, height: '100%', background: usageColor, borderRadius: 100, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Availability toggle */}
        <div style={{ padding: '8px 10px', borderTop: '0.5px solid var(--pf-border)' }}>
          <AvailabilityToggle />
        </div>

        {/* User */}
        <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '12px 14px' }}>
          <Link href="/vet/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: avatarUrl ? 'transparent' : 'var(--pf-coral-soft)',
              color: 'var(--pf-coral)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--pf-font-body)', fontSize: 13, fontWeight: 700,
              overflow: 'hidden', border: '1.5px solid var(--pf-border)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : userName[0]
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, fontWeight: 500, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130, display: 'block' }}>
                {userName}
              </span>
              {role && (
                <span style={{ fontFamily: 'var(--pf-font-body)', fontSize: 10, color: 'var(--pf-muted)' }}>
                  {role === 'vet_admin' ? 'Admin de clínica' : role === 'veterinarian' ? 'Veterinario/a' : role}
                </span>
              )}
            </div>
          </Link>
          <LogoutSidebarButton />
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, marginLeft: 220, padding: 32 }}>
        {children}
      </main>

      <style>{`
        .pf-nav-item[data-active="false"]:hover { background: var(--pf-surface) !important; }
      `}</style>
    </div>
  )
}
