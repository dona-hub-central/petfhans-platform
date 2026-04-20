'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/admin',              icon: '📊', label: 'Dashboard',      exact: true },
  { href: '/admin/clinics',      icon: '🏥', label: 'Clínicas',       exact: false },
  { href: '/admin/subscriptions',icon: '💳', label: 'Suscripciones',  exact: false },
  { href: '/admin/agent',        icon: '🤖', label: 'Agente IA',      exact: false },
  { href: '/admin/tiers',        icon: '📊', label: 'Tarifas',        exact: false },
  { href: '/admin/user-plans',   icon: '👤', label: 'Planes usuario', exact: false },
  { href: '/admin/stripe',       icon: '⚡', label: 'Stripe',         exact: false },
  { href: '/admin/profile',      icon: '👤', label: 'Mi perfil',      exact: false },
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
      <aside className="w-56 bg-white border-r flex flex-col fixed h-full z-10"
        style={{ borderColor: 'var(--pf-border)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'var(--pf-coral-soft)' }}>🐾</div>
            <div>
              <p className="font-bold text-xs leading-tight" style={{ color: 'var(--pf-ink)' }}>Petfhans</p>
              <p className="text-xs leading-tight" style={{ color: 'var(--pf-muted)' }}>Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => {
            const active = isActive(item)
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

        {/* User + Logout */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--pf-border)' }}>
          <Link href="/admin/profile" className="flex items-center gap-2.5 mb-2 group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
              {userName?.[0] ?? 'A'}
            </div>
            <span className="text-xs truncate max-w-[110px] group-hover:underline" style={{ color: 'var(--pf-ink)' }}>{userName}</span>
          </Link>
          <button onClick={logout}
            className="w-full text-xs py-1.5 rounded-lg border transition text-left px-2"
            style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-56">
        {children}
      </main>
    </div>
  )
}
