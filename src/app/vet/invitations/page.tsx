import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'
import { InvitationCard } from '@/components/vet/InvitationCard'
import { Mail } from 'lucide-react'

export default async function InvitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: invitations } = await admin.from('invitations')
    .select('*, pets(name)')
    .eq('clinic_id', profile?.clinic_id)
    .order('created_at', { ascending: false })

  const active = invitations?.filter(i => !i.used_at && new Date(i.expires_at) > new Date()) ?? []
  const used   = invitations?.filter(i => i.used_at) ?? []
  const expired = invitations?.filter(i => !i.used_at && new Date(i.expires_at) <= new Date()) ?? []

  const appUrl = 'https://clinicavet.petfhans.com'

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Invitaciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{active.length} activas</p>
        </div>
        <Link href="/vet/invitations/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva invitación
        </Link>
      </div>

      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--pf-ink)' }}>Activas</h3>
          <div className="space-y-3">
            {active.map((inv: any) => (
              <InvitationCard key={inv.id} inv={inv} appUrl={appUrl} status="active" />
            ))}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--pf-muted)' }}>Aceptadas</h3>
          <div className="space-y-2">
            {used.map((inv: any) => (
              <InvitationCard key={inv.id} inv={inv} appUrl={appUrl} status="used" />
            ))}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--pf-muted)' }}>Expiradas</h3>
          <div className="space-y-2">
            {expired.map((inv: any) => (
              <InvitationCard key={inv.id} inv={inv} appUrl={appUrl} status="expired" />
            ))}
          </div>
        </div>
      )}

      {(!invitations || invitations.length === 0) && (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
            <Mail size={40} strokeWidth={1.5} />
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--pf-ink)' }}>Sin invitaciones aún</p>
          <p className="text-xs mt-1 mb-6" style={{ color: 'var(--pf-muted)' }}>Invita a veterinarios o dueños de mascotas</p>
          <Link href="/vet/invitations/new" className="btn-pf px-6 py-2.5 text-sm inline-block">
            + Nueva invitación
          </Link>
        </div>
      )}
    </VetLayout>
  )
}


