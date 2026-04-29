import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { BadgeCheck, MapPin, Star, Users, AlertCircle } from 'lucide-react'
import CareRequestForm from '@/components/marketplace/CareRequestForm'
import ClinicJoinRequestForm from '@/components/marketplace/ClinicJoinRequestForm'
import type { ClinicPublicProfile } from '@/types'

export const metadata = { title: 'Clínica · Marketplace · Petfhans' }

export default async function ClinicPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { slug } = await params
  const admin = createAdminClient()

  const { data: clinic } = await admin
    .from('clinics')
    .select('id, name, slug, verified, public_profile')
    .eq('slug', slug)
    .single()

  if (!clinic) notFound()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Is user blocked by this clinic?
  let isBlocked = false
  if (profile.role === 'pet_owner') {
    const { data: block } = await admin
      .from('clinic_blocks')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('owner_id', profile.id)
      .maybeSingle()
    isBlocked = !!block
  }

  // Vet team via profile_clinics (profiles.clinic_id nullified in migration 019)
  const { data: teamLinks } = await admin
    .from('profile_clinics')
    .select('user_id')
    .eq('clinic_id', clinic.id)
    .in('role', ['vet_admin', 'veterinarian'])
  const teamUserIds = (teamLinks ?? []).map((l: { user_id: string }) => l.user_id)
  const { data: team } = teamUserIds.length > 0
    ? await admin
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('user_id', teamUserIds)
        .order('full_name')
    : { data: [] }

  // Ratings
  const { data: appointments } = await admin
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('status', 'completed')

  const apptIds = (appointments ?? []).map((a: { id: string }) => a.id)
  let ratings: Array<{ rating: number; comment: string | null; created_at: string }> = []
  if (apptIds.length > 0) {
    const { data: ratingRows } = await admin
      .from('appointment_ratings')
      .select('rating, comment, created_at')
      .in('appointment_id', apptIds)
      .eq('rated_by', 'owner')
      .order('created_at', { ascending: false })
      .limit(20)
    ratings = ratingRows ?? []
  }

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null

  // Owner pets for care request form
  let pets: Array<{ id: string; name: string; species: string }> = []
  if (profile.role === 'pet_owner') {
    const { data: access } = await admin
      .from('pet_access')
      .select('pet_id')
      .eq('owner_id', profile.id)
    const petIds = (access ?? []).map((a: { pet_id: string }) => a.pet_id)
    if (petIds.length > 0) {
      const { data: petRows } = await admin
        .from('pets')
        .select('id, name, species')
        .in('id', petIds)
        .eq('is_active', true)
      pets = petRows ?? []
    }
  }

  const pp = clinic.public_profile as ClinicPublicProfile | null
  const isVet = profile.role === 'vet_admin' || profile.role === 'veterinarian'
  const vetTeam = team ?? []

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Cover / header */}
      <div
        style={{
          background: pp?.cover_url
            ? `url(${pp.cover_url}) center/cover`
            : 'linear-gradient(135deg, var(--pf-coral) 0%, #f9a394 100%)',
          borderRadius: 20, height: 160, marginBottom: -40, position: 'relative',
        }}
      />

      <div
        style={{
          background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
          padding: '52px 24px 24px', marginBottom: 16,
          boxShadow: 'var(--pf-shadow-sm)',
        }}
      >
        {/* Clinic avatar */}
        <div
          style={{
            position: 'absolute', marginTop: -80,
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, fontFamily: 'var(--pf-font-display)',
            border: '3px solid #fff', boxShadow: 'var(--pf-shadow-sm)',
          }}
        >
          {clinic.name[0]?.toUpperCase()}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, fontFamily: 'var(--pf-font-display)' }}>
                {clinic.name}
              </h1>
              {clinic.verified && (
                <BadgeCheck size={18} strokeWidth={2} style={{ color: '#0891b2' }} aria-label="Verificada" />
              )}
            </div>
            {pp?.city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MapPin size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--pf-muted)' }}>{pp.city}</span>
              </div>
            )}
            {avgRating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <Star
                    key={n}
                    size={14}
                    strokeWidth={1.5}
                    style={{ color: '#f59e0b', fill: n <= Math.round(avgRating) ? '#f59e0b' : 'none' }}
                  />
                ))}
                <span style={{ fontSize: 13, color: 'var(--pf-muted)', marginLeft: 4 }}>
                  {avgRating.toFixed(1)} ({ratings.length})
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          {isBlocked ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
              }}
            >
              <AlertCircle size={14} strokeWidth={2} style={{ color: '#dc2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                Esta clínica no está disponible para ti
              </span>
            </div>
          ) : profile.role === 'pet_owner' ? (
            <CareRequestForm
              clinicId={clinic.id}
              clinicName={clinic.name}
              pets={pets}
              vets={vetTeam.map(v => ({ id: v.id, full_name: v.full_name }))}
            />
          ) : isVet ? (
            <ClinicJoinRequestForm clinicId={clinic.id} clinicName={clinic.name} />
          ) : null}
        </div>

        {pp?.description && (
          <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '16px 0 0', lineHeight: 1.6 }}>
            {pp.description}
          </p>
        )}

        {pp?.specialties && pp.specialties.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {pp.specialties.map(s => (
              <span
                key={s}
                style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 99,
                  background: 'var(--pf-coral-soft)', color: 'var(--pf-coral-dark)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {pp?.hours && (
          <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '12px 0 0' }}>
            <strong style={{ color: 'var(--pf-ink)' }}>Horario:</strong> {pp.hours}
          </p>
        )}
      </div>

      {/* Team */}
      {vetTeam.length > 0 && (
        <section
          style={{
            background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
            padding: '20px 24px', marginBottom: 16, boxShadow: 'var(--pf-shadow-sm)',
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} strokeWidth={2} />
            Equipo
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vetTeam.map(vet => (
              <div key={vet.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: vet.avatar_url ? 'transparent' : 'var(--pf-coral-soft)',
                    color: 'var(--pf-coral)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 15, fontWeight: 700,
                    border: '1.5px solid var(--pf-border)', overflow: 'hidden',
                  }}
                >
                  {vet.avatar_url
                    ? <img src={vet.avatar_url} alt={vet.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : vet.full_name[0]?.toUpperCase()
                  }
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pf-ink)', margin: 0 }}>{vet.full_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--pf-muted)', margin: 0 }}>
                    {vet.role === 'vet_admin' ? 'Admin de clínica' : 'Veterinario/a'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ratings */}
      {ratings.length > 0 && (
        <section
          style={{
            background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
            padding: '20px 24px', boxShadow: 'var(--pf-shadow-sm)',
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={14} strokeWidth={2} />
            Valoraciones
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ratings.map((r, i) => (
              <div key={i} style={{ paddingBottom: 12, borderBottom: i < ratings.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(n => (
                    <Star
                      key={n}
                      size={12}
                      strokeWidth={1.5}
                      style={{ color: '#f59e0b', fill: n <= r.rating ? '#f59e0b' : 'none' }}
                    />
                  ))}
                  <span style={{ fontSize: 11, color: 'var(--pf-muted)', marginLeft: 4 }}>
                    {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.comment && <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
