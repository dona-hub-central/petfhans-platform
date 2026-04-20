'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function Icon({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'bar-chart')  return <svg {...common}><rect x="3" y="9" width="4" height="12"/><rect x="10" y="5" width="4" height="16"/><rect x="17" y="1" width="4" height="20"/></svg>
  if (name === 'hospital')   return <svg {...common}><path d="M12 6v12M6 12h12"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
  if (name === 'card')       return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
  if (name === 'sparkles')   return <svg {...common}><path d="m12 3-1.9 5.8L4 10l5.8 1.9L11.9 18l1.9-5.8L20 10.3l-5.8-1.9z"/></svg>
  if (name === 'layers')     return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  if (name === 'user')       return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
  if (name === 'zap')        return <svg {...common}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  return null
}

const nav = [
  { href: '/admin',               icon: 'bar-chart', label: 'Dashboard',      exact: true },
  { href: '/admin/clinics',       icon: 'hospital',  label: 'Clínicas',       exact: false },
  { href: '/admin/subscriptions', icon: 'card',      label: 'Suscripciones',  exact: false },
  { href: '/admin/agent',         icon: 'sparkles',  label: 'Agente IA',      exact: false, tint: 'purple' },
  { href: '/admin/tiers',         icon: 'layers',    label: 'Tarifas',        exact: false },
  { href: '/admin/user-plans',    icon: 'user',      label: 'Planes usuario', exact: false },
  { href: '/admin/stripe',        icon: 'zap',       label: 'Stripe',         exact: false },
  { href: '/admin/profile',       icon: 'user',      label: 'Mi perfil',      exact: false },
]

export default function AdminLayout({
  children,
  userName,
}: {
  children: React.ReactNode
  userName: string
}) {
  const path = usePathname()
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (item: typeof nav[0]) =>
    item.exact ? path === item.href : path.startsWith(item.href)

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
            <div style={{ fontSize: 11, color: 'var(--pf-muted)' }}>Super Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const active = isActive(item)
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

        {/* User + Logout */}
        <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '14px 16px' }}>
          <Link href="/admin/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {userName?.[0] ?? 'A'}
            </div>
            <span style={{ fontSize: 13, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{userName}</span>
          </Link>
          <button onClick={logout}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--pf-border)', color: 'var(--pf-muted)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, marginLeft: 220 }}>
        {children}
      </main>
    </div>
  )
}
