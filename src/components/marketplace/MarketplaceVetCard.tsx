import Link from 'next/link'
import type { MarketplaceVet } from '@/types'

interface Props {
  vet: MarketplaceVet
}

export default function MarketplaceVetCard({ vet }: Props) {
  const initial = vet.full_name[0]?.toUpperCase() ?? '?'

  return (
    <Link
      href={`/marketplace/veterinarios/${vet.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all"
        style={{
          borderColor: 'var(--pf-border)',
          boxShadow: 'var(--pf-shadow-sm)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--pf-coral-mid)'
          el.style.boxShadow = 'var(--pf-shadow-card-hover)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--pf-border)'
          el.style.boxShadow = 'var(--pf-shadow-sm)'
        }}
      >
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {vet.avatar_url ? (
            <img
              src={vet.avatar_url}
              alt={vet.full_name}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                objectFit: 'cover', border: '1.5px solid var(--pf-border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, fontFamily: 'var(--pf-font-display)',
                border: '1.5px solid var(--pf-border)',
              }}
            >
              {initial}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 14, fontWeight: 700, color: 'var(--pf-ink)',
              margin: 0, fontFamily: 'var(--pf-font-display)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {vet.full_name}
          </p>
          {vet.clinics && (
            <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: '2px 0 0' }}>
              {vet.clinics.name}
            </p>
          )}
        </div>

        <span style={{ color: 'var(--pf-hint)', fontSize: 20, flexShrink: 0 }}>›</span>
      </div>
    </Link>
  )
}
