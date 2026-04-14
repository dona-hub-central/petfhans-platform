'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/admin',              icon: '📊', label: 'Dashboard',      exact: true },
  { href: '/admin/clinics',      icon: '🏥', label: 'Clínicas',       exact: false },
  { href: '/admin/subscriptions',icon: '💳', label: 'Suscripciones',  exact: false },
  { href: '/admin/plans',        icon: '📦', label: 'Planes',         exact: false },
  { href: '/admin/stripe',       icon: '⚡', label: 'Stripe',         exact: false },
]

export default function AdminLayout({
  children,
  userName,
}: {
  children: React.ReactNode
  userName: string
}) {
  const path = usePathname()

  const isActive = (item: typeof nav[0]) =>
    item.exact ? path === item.href : path.startsWith(item.href)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col fixed h-full z-10"
        style={{ borderColor: 'var(--border)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'var(--accent-s)' }}>🐾</div>
            <div>
              <p className="font-bold text-xs leading-tight" style={{ color: 'var(--text)' }}>Petfhans</p>
              <p className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>Super Admin</p>
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
                  background: active ? 'var(--accent-s)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                }}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
              {userName?.[0] ?? 'A'}
            </div>
            <span className="text-xs truncate max-w-[110px]" style={{ color: 'var(--text)' }}>{userName}</span>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-56">
        {children}
      </main>
    </div>
  )
}
