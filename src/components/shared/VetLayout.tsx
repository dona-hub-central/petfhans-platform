'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Calendar, PawPrint, ClipboardList, Mail, Sparkles, Users, CreditCard, LogOut, Menu, X, Store, Inbox, Settings } from 'lucide-react'
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
  { href: '/vet/dashboard',        Icon: Home,          label: 'Inicio' },
  { href: '/vet/appointments',     Icon: Calendar,      label: 'Citas' },
  { href: '/vet/pets',             Icon: PawPrint,      label: 'Mascotas' },
  { href: '/vet/records',          Icon: ClipboardList, label: 'Consultas' },
  { href: '/vet/invitations',      Icon: Mail,          label: 'Invitaciones' },
  { href: '/vet/requests',         Icon: Inbox,         label: 'Solicitudes' },
  { href: '/vet/ai',               Icon: Sparkles,      label: 'IA Clínica', tint: 'purple' as const },
  { href: '/marketplace/clinicas', Icon: Store,         label: 'Marketplace' },
  { href: '/vet/team',             Icon: Users,         label: 'Equipo' },
  { href: '/vet/billing',          Icon: CreditCard,    label: 'Facturación' },
  { href: '/vet/settings',         Icon: Settings,      label: 'Configuración' },
]

const bottomNavItems = [
  { href: '/vet/dashboard',    Icon: Home,     label: 'Inicio' },
  { href: '/vet/appointments', Icon: Calendar, label: 'Citas' },
  { href: '/vet/pets',         Icon: PawPrint, label: 'Mascotas' },
]

function AvatarCircle({ avatarUrl, userName, size = 30 }: { avatarUrl?: string | null; userName: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarUrl ? 'transparent' : 'var(--pf-coral-soft)',
      color: 'var(--pf-coral)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--pf-font-body)', fontSize: Math.round(size * 0.43), fontWeight: 700,
      overflow: 'hidden', border: '1.5px solid var(--pf-border)',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : userName[0]
      }
    </div>
  )
}

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/vet/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUsage(d) })
      .catch(() => null)
  }, [])

  useEffect(() => { setDrawerOpen(false) }, [path])

  const usagePct   = usage && usage.max > 0 ? Math.min((usage.count / usage.max) * 100, 100) : 0
  const usageColor = usagePct >= 100 ? 'var(--pf-danger-fg)' : usagePct >= 80 ? 'var(--pf-warning-fg)' : 'var(--pf-coral)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--pf-bg)' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="pf-sidebar" style={{
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '18px 16px', borderBottom: '0.5px solid var(--pf-border)' }}>
          <img src="/logo-icon.svg" width={32} height={32} alt="Petfhans" style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 13, color: 'var(--pf-ink)' }}>Petfhans</div>
            <div style={{ fontFamily: 'var(--pf-font-body)', fontSize: 11, color: 'var(--pf-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{clinicName}</div>
          </div>
        </div>

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

        <div style={{ padding: '8px 10px', borderTop: '0.5px solid var(--pf-border)' }}>
          <AvailabilityToggle />
        </div>

        <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '12px 14px' }}>
          <Link href="/vet/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <AvatarCircle avatarUrl={avatarUrl} userName={userName} size={30} />
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

      {/* ── MOBILE TOP HEADER ── */}
      <header className="pf-mob-header">
        <div className="pf-mob-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-icon.svg" width={28} height={28} alt="Petfhans" style={{ borderRadius: 8 }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 13, color: 'var(--pf-ink)' }}>Petfhans</div>
              <div style={{ fontFamily: 'var(--pf-font-body)', fontSize: 10, color: 'var(--pf-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clinicName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/vet/profile" style={{ textDecoration: 'none' }}>
              <AvatarCircle avatarUrl={avatarUrl} userName={userName} size={32} />
            </Link>
            <button onClick={() => setDrawerOpen(true)} className="pf-mob-menu-btn" aria-label="Abrir menú">
              <Menu size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT DRAWER ── */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div className="pf-drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--pf-border)' }}>
              <Link href="/vet/profile" onClick={() => setDrawerOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <AvatarCircle avatarUrl={avatarUrl} userName={userName} size={38} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--pf-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{userName}</p>
                  {role && <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 11, color: 'var(--pf-muted)', margin: 0 }}>{role === 'vet_admin' ? 'Admin de clínica' : role === 'veterinarian' ? 'Veterinario/a' : role}</p>}
                </div>
              </Link>
              <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--pf-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pf-muted)' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {nav.map(item => {
                const active = path.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 12px', borderRadius: 12,
                      fontFamily: 'var(--pf-font-body)', fontSize: 15,
                      fontWeight: active ? 600 : 400, textDecoration: 'none',
                      background: active ? (item.tint === 'purple' ? 'var(--pf-info)' : 'var(--pf-coral-soft)') : 'transparent',
                      color: active ? (item.tint === 'purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)') : 'var(--pf-ink)',
                      minHeight: 44,
                    }}>
                    <item.Icon size={19} strokeWidth={2} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div style={{ borderTop: '0.5px solid var(--pf-border)', padding: '10px 12px 4px' }}>
              <AvailabilityToggle />
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <LogoutSidebarButton />
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="pf-main-content" style={{ flex: 1, marginLeft: 220, padding: 32 }}>
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="pf-mob-bottom" aria-label="Navegación principal">
        <div className="pf-mob-bottom-inner">
          {bottomNavItems.map(item => {
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 0', textDecoration: 'none',
                color: active ? 'var(--pf-coral)' : 'var(--pf-muted)',
                flex: 1,
              }}>
                <item.Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                <span style={{ fontSize: 10, fontFamily: 'var(--pf-font-body)', fontWeight: active ? 600 : 400 }}>{item.label}</span>
              </Link>
            )
          })}
          <button onClick={() => setDrawerOpen(true)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--pf-muted)', flex: 1,
          }}>
            <Menu size={22} strokeWidth={1.75} />
            <span style={{ fontSize: 10, fontFamily: 'var(--pf-font-body)', fontWeight: 400 }}>Más</span>
          </button>
        </div>
      </nav>

      <style>{`
        .pf-nav-item[data-active="false"]:hover { background: var(--pf-surface) !important; }

        .pf-mob-header { display: none; }
        .pf-mob-bottom { display: none; }

        .pf-mob-menu-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--pf-border);
          background: transparent; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--pf-ink);
        }

        .pf-drawer {
          position: absolute; top: 0; right: 0; bottom: 0;
          width: 72vw; max-width: 280px;
          background: var(--pf-white);
          box-shadow: -8px 0 24px rgba(0,0,0,0.12);
          display: flex; flex-direction: column;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }

        @media (max-width: 767px) {
          .pf-sidebar { display: none !important; }

          .pf-mob-header {
            display: block;
            position: fixed; top: 0; left: 0; right: 0; z-index: 40;
            background: var(--pf-white);
            border-bottom: 0.5px solid var(--pf-border);
            padding-top: env(safe-area-inset-top);
          }
          .pf-mob-header-inner {
            height: 56px;
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 0 16px;
          }

          .pf-mob-bottom {
            display: block;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
            background: var(--pf-white);
            border-top: 0.5px solid var(--pf-border);
            padding-bottom: env(safe-area-inset-bottom);
          }
          .pf-mob-bottom-inner {
            height: 60px;
            display: flex; align-items: center;
            justify-content: space-around;
          }

          .pf-main-content {
            margin-left: 0 !important;
            padding: calc(56px + env(safe-area-inset-top) + 16px) 16px calc(60px + env(safe-area-inset-bottom) + 16px) !important;
          }
        }
      `}</style>
    </div>
  )
}
