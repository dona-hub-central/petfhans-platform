'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Store, FileUp, Sparkles, Camera } from 'lucide-react'
import PetSelectorModal from './PetSelectorModal'

type Pet = { id: string; name: string; photo_url: string | null; species: string }

type ActionKey = 'messages' | 'marketplace' | 'docs' | 'recetas' | 'fotos'

const ACTIONS: {
  key: ActionKey
  label: string
  Icon: typeof MessageCircle
  requiresPet: boolean
  isAi?: boolean
}[] = [
  { key: 'messages',    label: 'Mensajes',    Icon: MessageCircle, requiresPet: false },
  { key: 'marketplace', label: 'Marketplace', Icon: Store,         requiresPet: false },
  { key: 'docs',        label: 'Documentos',  Icon: FileUp,        requiresPet: true  },
  { key: 'recetas',     label: 'Recetas IA',  Icon: Sparkles,      requiresPet: true, isAi: true },
  { key: 'fotos',       label: 'Subir fotos', Icon: Camera,        requiresPet: true  },
]

const ROUTES: Record<ActionKey, (petId?: string) => string> = {
  messages:    ()   => '/owner/messages',
  marketplace: ()   => '/marketplace/clinicas',
  docs:        (id) => `/owner/pets/${id}?tab=docs`,
  recetas:     (id) => `/owner/pets/${id}?tab=recetas`,
  fotos:       (id) => `/owner/pets/${id}?tab=galeria`,
}

export default function QuickActionsWidget({
  pets,
  unreadMessages,
  selectedPetId,
}: {
  pets: Pet[]
  unreadMessages: number
  selectedPetId?: string
}) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null)

  const handleAction = (key: ActionKey) => {
    const action = ACTIONS.find(a => a.key === key)!
    if (action.requiresPet) {
      if (pets.length === 0) {
        router.push('/owner/pets/new')
        return
      }
      if (pets.length > 1) {
        setPendingAction(key)
        return
      }
    }
    const petId = selectedPetId ?? pets[0]?.id
    router.push(ROUTES[key](petId))
  }

  return (
    <>
      <div className="pf-quick-card">
        <p className="pf-quick-title">Acciones rápidas</p>

        <div className="pf-quick-grid">
          {ACTIONS.map(({ key, label, Icon, isAi }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleAction(key)}
              className={`pf-quick-btn${isAi ? ' pf-quick-btn-ai' : ''}`}
            >
              <span className="pf-quick-icon-wrap">
                <Icon size={22} strokeWidth={1.75} />
                {key === 'messages' && unreadMessages > 0 && (
                  <span className="pf-quick-badge" aria-label={`${unreadMessages} mensajes sin leer`}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </span>
              <span className="pf-quick-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {pendingAction && (
        <PetSelectorModal
          pets={pets}
          actionLabel={ACTIONS.find(a => a.key === pendingAction)!.label}
          onSelect={petId => {
            const action = pendingAction
            setPendingAction(null)
            router.push(ROUTES[action](petId))
          }}
          onClose={() => setPendingAction(null)}
        />
      )}

      <style>{`
        .pf-quick-card {
          background: var(--pf-white);
          border-radius: 20px;
          padding: 20px;
          border: 0.5px solid var(--pf-border);
          box-shadow: var(--pf-shadow-sm);
        }
        .pf-quick-title {
          font-family: var(--pf-font-body);
          font-size: 11px; font-weight: 700; color: var(--pf-muted);
          text-transform: uppercase; letter-spacing: .07em;
          margin: 0 0 14px;
        }
        .pf-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (min-width: 600px) {
          .pf-quick-grid { grid-template-columns: repeat(5, 1fr); }
        }
        .pf-quick-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px;
          padding: 16px 8px;
          background: var(--pf-surface);
          border: 0.5px solid var(--pf-border);
          border-radius: 14px;
          cursor: pointer;
          color: var(--pf-ink);
          font-family: var(--pf-font-body);
          transition: background .15s, border-color .15s, transform .1s;
        }
        .pf-quick-btn:hover {
          background: var(--pf-coral-soft);
          border-color: var(--pf-coral-mid);
          color: var(--pf-coral);
        }
        .pf-quick-btn-ai .pf-quick-icon-wrap { color: var(--pf-info-fg); }
        .pf-quick-btn-ai:hover {
          background: var(--pf-info);
          border-color: var(--pf-info-fg);
          color: var(--pf-info-fg);
        }
        .pf-quick-btn:active { transform: scale(.97); }
        .pf-quick-icon-wrap {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .pf-quick-badge {
          position: absolute; top: -6px; right: -10px;
          min-width: 17px; height: 17px;
          background: var(--pf-coral); color: #fff;
          border-radius: 999px;
          font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px;
        }
        .pf-quick-label {
          font-size: 11px; font-weight: 600;
          text-align: center; line-height: 1.2;
        }
      `}</style>
    </>
  )
}
