import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Store, Stethoscope } from 'lucide-react'

export const metadata = { title: 'Marketplace · Petfhans' }

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const backHref = '/owner/dashboard'

  return (
    <div style={{ minHeight: '100svh', background: 'var(--pf-bg)', fontFamily: 'var(--pf-font-body)' }}>
      {/* Top nav */}
      <header
        style={{
          background: '#fff', borderBottom: '1px solid var(--pf-border)',
          position: 'sticky', top: 0, zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 960, margin: '0 auto',
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 16px',
          }}
        >
          <Link
            href={backHref}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--pf-muted)', textDecoration: 'none', fontSize: 13,
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Volver
          </Link>

          <span style={{ color: 'var(--pf-border)', fontSize: 18, userSelect: 'none' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <Store size={16} strokeWidth={2} style={{ color: 'var(--pf-coral)', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)', fontFamily: 'var(--pf-font-display)' }}>
              Marketplace
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink href="/marketplace/clinicas" icon={<Store size={13} strokeWidth={2} />} label="Clínicas" />
            <NavLink href="/marketplace/veterinarios" icon={<Stethoscope size={13} strokeWidth={2} />} label="Veterinarios" />
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        color: 'var(--pf-ink)', textDecoration: 'none',
        border: '1px solid var(--pf-border)',
        background: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {icon}
      {label}
    </Link>
  )
}
