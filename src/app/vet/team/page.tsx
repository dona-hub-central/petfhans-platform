import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { Users } from 'lucide-react'
import type { Profile } from '@/types'

const roleLabel: Record<string, { label: string; color: string; bg: string }> = {
  vet_admin:    { label: 'Admin',        color: '#6d28d9', bg: '#f3e8ff' },
  veterinarian: { label: 'Veterinario',  color: '#1d4ed8', bg: '#eff6ff' },
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'vet_admin') redirect('/vet/dashboard')

  const admin = createAdminClient()
  const { data: clinicLink } = await admin
    .from('profile_clinics').select('clinic_id').eq('user_id', user.id).limit(1).single()
  const clinicId = clinicLink?.clinic_id
  if (!clinicId) redirect('/vet/dashboard')

  const { data: memberLinks } = clinicId
    ? await admin.from('profile_clinics').select('user_id').eq('clinic_id', clinicId).in('role', ['vet_admin', 'veterinarian'])
    : { data: [] }
  const memberUserIds = (memberLinks ?? []).map((m: { user_id: string }) => m.user_id)
  const { data: team } = memberUserIds.length > 0
    ? await admin.from('profiles').select('*').in('user_id', memberUserIds).order('created_at')
    : { data: [] }

  return (
    <>
      <div className="pf-page-hdr mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Equipo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{team?.length ?? 0} miembros</p>
        </div>
        <Link href="/vet/invitations/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Invitar miembro
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
        <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
          {team && team.length > 0 ? (team as Profile[]).map((member) => {
            const rs = roleLabel[member.role] ?? roleLabel.veterinarian
            return (
              <div key={member.id} className="px-6 py-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                  style={{ background: rs.bg, color: rs.color }}>
                  {member.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>{member.full_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{member.email}</p>
                  {member.phone && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{member.phone}</p>
                  )}
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                  style={{ background: rs.bg, color: rs.color }}>
                  {rs.label}
                </span>
              </div>
            )
          }) : (
            <div className="px-6 py-16 text-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
                <Users size={40} strokeWidth={1.5} />
              </div>
              <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>Sin equipo aún</p>
              <Link href="/vet/invitations/new"
                className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--pf-coral)' }}>
                Invitar primer miembro →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
