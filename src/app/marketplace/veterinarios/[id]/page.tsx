import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { Building2, BadgeCheck, MapPin } from 'lucide-react'
import CareRequestForm from '@/components/marketplace/CareRequestForm'
import ClinicJoinRequestForm from '@/components/marketplace/ClinicJoinRequestForm'
import type { ClinicPublicProfile } from '@/types'

export const metadata = { title: 'Veterinario · Marketplace · Petfhans' }

export default async function VetPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const admin = createAdminClient()

  const { data: vet } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role, user_id')
    .eq('id', id)
    .in('role', ['vet_admin', 'veterinarian'])
    .single()

  if (!vet) notFound()

  const { data: vetClinicLink } = await admin
    .from('profile_clinics')
    .select('clinic_id, clinics(id, name, slug, verified, public_profile)')
    .eq('user_id', vet.user_id)
    .limit(1)
    .single()

  if (!vetClinicLink?.clinic_id) notFound()

  type ClinicJoin = { id: string; name: string; slug: string; verified: boolean; public_profile: ClinicPublicProfile | null }
  const clinic = (vetClinicLink.clinics as unknown as ClinicJoin | null)
  const clinicId = vetClinicLink.clinic_id

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Owner pets for care request
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

  const isVet = profile.role === 'vet_admin' || profile.role === 'veterinarian'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Profile card */}
      <div
        style={{
          background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
          padding: '24px', marginBottom: 16, boxShadow: 'var(--pf-shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0 }}>
            {vet.avatar_url ? (
              <img
                src={vet.avatar_url}
                alt={vet.full_name}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  objectFit: 'cover', border: '2px solid var(--pf-border)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, fontFamily: 'var(--pf-font-display)',
                  border: '2px solid var(--pf-border)',
                }}
              >
                {vet.full_name[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, fontFamily: 'var(--pf-font-display)' }}>
              {vet.full_name}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '3px 0 0' }}>
              {vet.role === 'vet_admin' ? 'Admin de clínica' : 'Veterinario/a'}
            </p>

            {clinic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Building2 size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
                <span style={{ fontSize: 13, color: 'var(--pf-muted)' }}>{clinic.name}</span>
                {clinic.verified && (
                  <BadgeCheck size={13} strokeWidth={2} style={{ color: '#0891b2' }} aria-label="Clínica verificada" />
                )}
              </div>
            )}

            {clinic?.public_profile?.city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MapPin size={11} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
                <span style={{ fontSize: 12, color: 'var(--pf-muted)' }}>{clinic.public_profile.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pf-border)' }}>
          {profile.role === 'pet_owner' ? (
            <CareRequestForm
              clinicId={clinicId}
              clinicName={clinic?.name ?? ''}
              pets={pets}
              preselectedVetId={vet.id}
            />
          ) : isVet && clinic ? (
            <ClinicJoinRequestForm clinicId={clinic.id} clinicName={clinic.name} />
          ) : null}
        </div>
      </div>

      {/* Clinic info */}
      {clinic && (
        <div
          style={{
            background: '#fff', borderRadius: 20, border: '1px solid var(--pf-border)',
            padding: '20px 24px', boxShadow: 'var(--pf-shadow-sm)',
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--pf-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clínica
          </h2>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--pf-ink)', margin: 0, fontFamily: 'var(--pf-font-display)' }}>
            {clinic.name}
          </p>
          {clinic.public_profile?.description && (
            <p style={{ fontSize: 13, color: 'var(--pf-muted)', margin: '6px 0 0', lineHeight: 1.6 }}>
              {clinic.public_profile.description}
            </p>
          )}
          {clinic.public_profile?.specialties && clinic.public_profile.specialties.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {clinic.public_profile.specialties.map(s => (
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
        </div>
      )}
    </div>
  )
}
