'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, Calendar, User, Plus } from 'lucide-react'

const items = [
  { href: '/owner/dashboard',       Icon: Home,     label: 'Inicio',     match: '/owner/dashboard' },
  { href: '/marketplace/clinicas',  Icon: Store,    label: 'Marketplace', match: '/marketplace' },
  { href: '/owner/appointments',    Icon: Calendar, label: 'Mis citas',  match: '/owner/appointments' },
  { href: '/owner/profile',         Icon: User,     label: 'Perfil',     match: '/owner/profile' },
] as const

export default function OwnerBottomNav() {
  const path = usePathname()
  const fabActive = path.startsWith('/owner/appointments/new')

  return (
    <>
      <nav className="pf-own-bot" aria-label="Navegación principal">
        <div className="pf-own-bot-inner">
          {items.slice(0, 2).map(item => (
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

          {items.slice(2).map(item => (
            <BottomLink key={item.href} item={item} active={path.startsWith(item.match)} />
          ))}
        </div>
      </nav>

      <style>{`
        .pf-own-bot { display: none; }

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
            grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
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
      `}</style>
    </>
  )
}

function BottomLink({
  item,
  active,
}: {
  item: { href: string; Icon: typeof Home; label: string }
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
