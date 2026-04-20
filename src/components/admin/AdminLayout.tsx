'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BarChart2, Building2, CreditCard, Sparkles, Layers, User, Zap } from 'lucide-react'

const nav = [
  { href: '/admin',               Icon: BarChart2,  label: 'Dashboard',      exact: true },
  { href: '/admin/clinics',       Icon: Building2,  label: 'Clínicas',       exact: false },
  { href: '/admin/subscriptions', Icon: CreditCard, label: 'Suscripciones',  exact: false },
  { href: '/admin/agent',         Icon: Sparkles,   label: 'Agente IA',      exact: false, tint: 'purple' as const },
  { href: '/admin/tiers',         Icon: Layers,     label: 'Tarifas',        exact: false },
  { href: '/admin/user-plans',    Icon: User,       label: 'Planes usuario', exact: false },
  { href: '/admin/stripe',        Icon: Zap,        label: 'Stripe',         exact: false },
  { href: '/admin/profile',       Icon: User,       label: 'Mi perfil',      exact: false },
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
            <div style={{ fontFamily: 'var(--pf-font-body)', fontSize: 11, color: 'var(--pf-muted)' }}>Super Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const active = isActive(item)
            const color = active
              ? (item.tint === 'purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)')
              : 'var(--pf-muted)'
            const bg = active
              ? (item.tint === 'purple' ? 'var(--pf-info)' : 'var(--pf-coral-soft)')
              : 'transparent'
            return (
              <Link key={item.href} href={item.href}
                data-active={active ? 'true' : 'false'}
                className="pf-admin-nav-item"
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

        {/* User + Logout */}
        <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '14px 16px' }}>
          <Link href="/admin/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--pf-font-body)', fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {userName?.[0] ?? 'A'}
            </div>
            <span style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {userName}
            </span>
          </Link>
          <button onClick={logout} style={{
            width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8,
            border: '0.5px solid var(--pf-border)', color: 'var(--pf-muted)',
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--pf-font-body)',
          }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, marginLeft: 220 }}>
        {children}
      </main>

      <style>{`
        .pf-admin-nav-item[data-active="false"]:hover { background: var(--pf-surface) !important; }
      `}</style>
    </div>
  )
}
