'use client'

import Link from 'next/link'
import { BadgeCheck, MapPin, Star } from 'lucide-react'
import type { MarketplaceClinic } from '@/types'

interface Props {
  clinic: MarketplaceClinic & { avgRating?: number | null; ratingCount?: number }
}

export default function MarketplaceClinicCard({ clinic }: Props) {
  const profile = clinic.public_profile
  const initial = clinic.name?.[0]?.toUpperCase() ?? '?'

  return (
    <Link
      href={`/marketplace/clinicas/${clinic.slug}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="bg-white rounded-2xl border p-4 flex items-start gap-4 transition-all"
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
        <div
          style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, fontFamily: 'var(--pf-font-display)',
            border: '1.5px solid var(--pf-border)',
          }}
        >
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)',
                fontFamily: 'var(--pf-font-display)', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {clinic.name}
            </span>
            {clinic.verified && (
              <BadgeCheck
                size={15}
                strokeWidth={2}
                style={{ color: '#0891b2', flexShrink: 0 }}
                aria-label="Clínica verificada"
              />
            )}
          </div>

          {profile?.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <MapPin size={11} strokeWidth={2} style={{ color: 'var(--pf-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--pf-muted)' }}>{profile.city}</span>
            </div>
          )}

          {profile?.specialties && profile.specialties.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {profile.specialties.slice(0, 3).map(s => (
                <span
                  key={s}
                  style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 99,
                    background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {clinic.avgRating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Star size={12} strokeWidth={2} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pf-ink)' }}>
                {clinic.avgRating.toFixed(1)}
              </span>
              {clinic.ratingCount != null && (
                <span style={{ fontSize: 11, color: 'var(--pf-muted)' }}>
                  ({clinic.ratingCount})
                </span>
              )}
            </div>
          )}
        </div>

        <span style={{ color: 'var(--pf-hint)', fontSize: 20, flexShrink: 0, alignSelf: 'center' }}>›</span>
      </div>
    </Link>
  )
}
