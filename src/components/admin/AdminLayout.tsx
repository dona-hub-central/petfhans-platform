'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart2, Building2, CreditCard, Sparkles, Layers, User, Zap, Menu, X } from 'lucide-react'

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

function NavLinks({ path, onClick }: { path: string; onClick?: () => void }) {
  const isActive = (item: typeof nav[0]) =>
    item.exact ? path === item.href : path.startsWith(item.href)
  return (
    <>
      {nav.map(item => {
        const active = isActive(item)
        const color = active ? (item.tint === 'purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)') : 'var(--pf-muted)'
        const bg    = active ? (item.tint === 'purple' ? 'var(--pf-info)'    : 'var(--pf-coral-soft)') : 'transparent'
        return (
          <Link key={item.href} href={item.href} onClick={onClick}
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
    </>
  )
}

function UserFooter({ userName, onLogout, onClick }: { userName: string; onLogout: () => void; onClick?: () => void }) {
  return (
    <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '14px 16px' }}>
      <Link href="/admin/profile" onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
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
      <button onClick={() => { onClick?.(); onLogout() }} style={{
        width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8,
        border: '0.5px solid var(--pf-border)', color: 'var(--pf-muted)',
        background: 'transparent', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--pf-font-body)',
      }}>
        Cerrar sesión
      </button>
    </div>
  )
}

export default function AdminLayout({
  children,
  userName,
}: {
  children: React.ReactNode
  userName: string
}) {
  const path = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { setDrawerOpen(false) }, [path])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--pf-bg)' }}>

      {/* ── Desktop sidebar ── */}
      <aside className="pf-adm-sidebar">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '18px 16px', borderBottom: '0.5px solid var(--pf-border)' }}>
          <img src="/logo-icon.svg" width={32} height={32} alt="Petfhans" style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 13, color: 'var(--pf-ink)' }}>Petfhans</div>
            <div style={{ fontFamily: 'var(--pf-font-body)', fontSize: 11, color: 'var(--pf-muted)' }}>Super Admin</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <NavLinks path={path} />
        </nav>
        <UserFooter userName={userName} onLogout={logout} />
      </aside>

      {/* ── Mobile top header ── */}
      <header className="pf-adm-mob-hdr">
        <div className="pf-adm-mob-hdr-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-icon.svg" width={28} height={28} alt="" style={{ borderRadius: 8 }} />
            <span style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 15, color: 'var(--pf-ink)' }}>Admin</span>
          </div>
          <button
            className="pf-adm-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú">
            <Menu size={22} strokeWidth={2} style={{ color: 'var(--pf-ink)' }} />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="pf-adm-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <div className={`pf-adm-drawer${drawerOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--pf-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-icon.svg" width={28} height={28} alt="" style={{ borderRadius: 8 }} />
            <span style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 14, color: 'var(--pf-ink)' }}>Petfhans Admin</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pf-ink)', padding: 4 }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <NavLinks path={path} onClick={() => setDrawerOpen(false)} />
        </nav>
        <UserFooter userName={userName} onLogout={logout} onClick={() => setDrawerOpen(false)} />
      </div>

      {/* ── Main content ── */}
      <main className="pf-adm-main">
        {children}
      </main>

      <style>{`
        /* ── Sidebar (desktop) ── */
        .pf-adm-sidebar {
          width: 220px; background: var(--pf-white);
          border-right: 0.5px solid var(--pf-border);
          display: flex; flex-direction: column;
          height: 100vh; position: fixed; top: 0; left: 0; z-index: 10;
        }

        /* ── Main content area ── */
        .pf-adm-main { flex: 1; margin-left: 220px; }

        /* ── Mobile elements hidden on desktop ── */
        .pf-adm-mob-hdr, .pf-adm-overlay, .pf-adm-drawer { display: none; }

        /* ── Page padding utility ── */
        .adm-pg { padding: 32px; }

        /* ── Clinic row in lists ── */
        .adm-clinic-row {
          padding: 16px 24px; display: flex; align-items: center;
          justify-content: space-between; transition: background 0.15s;
        }
        .adm-clinic-row:hover { background: #f9f9f9; }
        .adm-clinic-row-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

        /* ── Nav hover ── */
        .pf-admin-nav-item[data-active="false"]:hover { background: var(--pf-surface) !important; }

        /* ── Mobile breakpoint ── */
        @media (max-width: 767px) {
          .pf-adm-sidebar { display: none !important; }
          .pf-adm-main { margin-left: 0; padding-top: calc(48px + env(safe-area-inset-top)); }

          /* Mobile top bar */
          .pf-adm-mob-hdr {
            display: block; position: fixed; top: 0; left: 0; right: 0; z-index: 40;
            background: #fff; border-bottom: 0.5px solid var(--pf-border);
            padding-top: env(safe-area-inset-top);
          }
          .pf-adm-mob-hdr-inner {
            height: 48px; padding: 0 16px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .pf-adm-menu-btn {
            display: flex; align-items: center; justify-content: center;
            width: 40px; height: 40px; border-radius: 10px;
            border: none; background: transparent; cursor: pointer;
          }

          /* Overlay */
          .pf-adm-overlay {
            display: block; position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 45;
          }

          /* Drawer */
          .pf-adm-drawer {
            display: flex; flex-direction: column;
            position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
            background: #fff; z-index: 50;
            transform: translateX(-100%); transition: transform 0.25s ease;
            box-shadow: 4px 0 20px rgba(0,0,0,0.12);
          }
          .pf-adm-drawer.open { transform: translateX(0); }

          /* Page padding */
          .adm-pg { padding: 16px 16px 32px; }

          /* Clinic rows */
          .adm-clinic-row { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px 16px; }
          .adm-clinic-row-right { justify-content: flex-start; }
        }
      `}</style>
    </div>
  )
}
