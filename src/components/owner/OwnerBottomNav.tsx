'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, Calendar, User, Plus } from 'lucide-react'
import PetfhansLogo from '@/components/shared/PetfhansLogo'

const items = [
  { href: '/marketplace/clinicas', Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',   Icon: Calendar, label: 'Mis citas',   match: '/owner/appointments' },
  { href: '/owner/dashboard',      Icon: User,     label: 'Perfil',      match: '/owner/dashboard' },
] as const

export default function OwnerBottomNav() {
  const path = usePathname()
  const fabActive = path.startsWith('/owner/appointments/new')

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="pf-own-bot" aria-label="Navegación principal">
        <div className="pf-own-bot-inner">
          {/* 1 item before FAB */}
          {items.slice(0, 1).map(item => (
            <BottomLink key={item.href} item={item} active={path.startsWith(item.match) && !fabActive} />
          ))}

          <Link
            href="/owner/appointments/new"
            className="pf-own-fab"
            aria-label="Pedir cita"
            data-active={fabActive ? 'true' : 'false'}
          >
            <span className="pf-own-fab-circle">
              <Plus size={26} strokeWidth={2.5} />
            </span>
            <span className="pf-own-fab-label">Pedir cita</span>
          </Link>

          {/* 2 items after FAB */}
          {items.slice(1).map(item => (
            <BottomLink key={item.href} item={item} active={path.startsWith(item.match) && !fabActive} />
          ))}
        </div>
      </nav>

      {/* Desktop / Tablet sidebar */}
      <aside className="pf-own-side" aria-label="Navegación principal">
        <Link href="/owner/dashboard" className="pf-own-side-brand">
          <PetfhansLogo size="sm" showTagline align="left" />
        </Link>

        <Link
          href="/owner/appointments/new"
          className="pf-own-side-cta"
          data-active={fabActive ? 'true' : 'false'}
        >
          <Plus size={16} strokeWidth={2.5} />
          Pedir cita
        </Link>

        <div className="pf-own-side-list">
          {items.map(item => {
            const active = path.startsWith(item.match) && !fabActive
            const { Icon } = item
            return (
              <Link
                key={item.href}
                href={item.href}
                className="pf-own-side-item"
                data-active={active ? 'true' : 'false'}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </aside>

      <style>{`
        .pf-own-bot { display: none; }
        .pf-own-side { display: none; }

        @media (max-width: 767px) {
          .pf-own-bot {
            display: block;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
            background: var(--pf-white);
            border-top: 0.5px solid var(--pf-border);
            padding-bottom: env(safe-area-inset-bottom);
          }
          .pf-own-bot-inner {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1.2fr 1fr 1fr;
            align-items: end;
            height: 64px;
          }
          .pf-own-link {
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            padding: 10px 0; text-decoration: none;
            color: var(--pf-muted);
            font-family: var(--pf-font-body);
            font-size: 10px; font-weight: 500;
          }
          .pf-own-link[data-active="true"] { color: var(--pf-coral); }
          .pf-own-link[data-active="true"] .pf-own-link-label { font-weight: 700; }

          .pf-own-fab {
            position: relative;
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            text-decoration: none;
            color: var(--pf-coral);
            font-family: var(--pf-font-body);
            font-size: 11px; font-weight: 600;
          }
          .pf-own-fab-circle {
            display: flex; align-items: center; justify-content: center;
            width: 56px; height: 56px; border-radius: 50%;
            background: var(--pf-coral); color: #fff;
            box-shadow: 0 4px 12px rgba(245,109,98,0.35);
            transform: translateY(-18px);
          }
          .pf-own-fab[data-active="true"] .pf-own-fab-circle {
            background: var(--pf-coral-dark);
          }
          .pf-own-fab-label {
            transform: translateY(-14px);
          }
        }

        @media (min-width: 768px) {
          .pf-own-side {
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0; top: 0; bottom: 0;
            width: 220px;
            background: var(--pf-white);
            border-right: 0.5px solid var(--pf-border);
            padding: 22px 12px;
            gap: 18px;
            z-index: 40;
          }
          .pf-own-side-brand {
            display: flex; align-items: center; gap: 10px;
            padding: 4px 8px;
            text-decoration: none;
          }
          .pf-own-side-logo {
            display: inline-flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 10px;
            background: var(--pf-coral-soft);
            color: var(--pf-coral);
          }
          .pf-own-side-name {
            font-family: var(--pf-font-display);
            font-size: 18px; font-weight: 700; color: var(--pf-ink);
            letter-spacing: -0.01em;
          }
          .pf-own-side-cta {
            display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            padding: 11px 14px; border-radius: 12px;
            background: var(--pf-coral); color: #fff;
            font-family: var(--pf-font-body);
            font-size: 14px; font-weight: 600;
            text-decoration: none;
            transition: background .15s;
          }
          .pf-own-side-cta:hover { background: var(--pf-coral-dark); }
          .pf-own-side-list {
            display: flex; flex-direction: column; gap: 2px;
          }
          .pf-own-side-item {
            display: flex; align-items: center; gap: 12px;
            padding: 11px 14px; border-radius: 10px;
            font-family: var(--pf-font-body);
            font-size: 14px; font-weight: 500;
            color: var(--pf-muted);
            text-decoration: none;
            transition: background .15s, color .15s;
          }
          .pf-own-side-item:hover {
            background: var(--pf-surface);
            color: var(--pf-ink);
          }
          .pf-own-side-item[data-active="true"] {
            background: var(--pf-coral-soft);
            color: var(--pf-coral);
            font-weight: 700;
          }
        }
      `}</style>
    </>
  )
}

function BottomLink({
  item,
  active,
}: {
  item: { href: string; Icon: typeof Store; label: string }
  active: boolean
}) {
  const { Icon } = item
  return (
    <Link href={item.href} className="pf-own-link" data-active={active ? 'true' : 'false'}>
      <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
      <span className="pf-own-link-label">{item.label}</span>
    </Link>
  )
}
