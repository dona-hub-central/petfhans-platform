import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

const roleLabel: Record<string, string> = {
  veterinarian: '👨‍⚕️ Veterinario',
  pet_owner:    '👤 Dueño de mascota',
  vet_admin:    '⚙️ Admin',
}

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Invitaciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{active.length} activas</p>
        </div>
        <Link href="/vet/invitations/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva invitación
        </Link>
      </div>

      {/* Activas */}
      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Activas</h3>
          <div className="space-y-3">
            {active.map((inv: any) => (
              <InvCard key={inv.id} inv={inv} appUrl={appUrl} status="active" />
            ))}
          </div>
        </div>
      )}

      {/* Usadas */}
      {used.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Aceptadas</h3>
          <div className="space-y-2">
            {used.map((inv: any) => (
              <InvCard key={inv.id} inv={inv} appUrl={appUrl} status="used" />
            ))}
          </div>
        </div>
      )}

      {/* Expiradas */}
      {expired.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Expiradas</h3>
          <div className="space-y-2">
            {expired.map((inv: any) => (
              <InvCard key={inv.id} inv={inv} appUrl={appUrl} status="expired" />
            ))}
          </div>
        </div>
      )}

      {(!invitations || invitations.length === 0) && (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-3">📨</div>
          <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>Sin invitaciones aún</p>
          <p className="text-xs mt-1 mb-6" style={{ color: 'var(--muted)' }}>Invita a veterinarios o dueños de mascotas</p>
          <Link href="/vet/invitations/new" className="btn-pf px-6 py-2.5 text-sm inline-block">
            + Nueva invitación
          </Link>
        </div>
      )}
    </VetLayout>
  )
}

function InvCard({ inv, appUrl, status }: { inv: any; appUrl: string; status: 'active' | 'used' | 'expired' }) {
  const link = `${appUrl}/auth/invite?token=${inv.token}`
  const statusStyle = {
    active:  { bg: '#edfaf1', color: '#1a7a3c', label: 'Activa' },
    used:    { bg: 'var(--bg)', color: 'var(--muted)', label: 'Aceptada' },
    expired: { bg: '#fff8e6', color: '#b07800', label: 'Expirada' },
  }[status]

  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{inv.email}</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
              {roleLabel[inv.role] ?? inv.role}
            </span>
            {inv.pets && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>· 🐾 {inv.pets.name}</span>
            )}
          </div>
          {status === 'active' && (
            <div className="mt-2 flex items-center gap-2">
              <code className="text-xs px-2 py-1 rounded-lg truncate max-w-[300px]"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {link}
              </code>
              <CopyBtn text={link} />
            </div>
          )}
          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
            {status === 'used' ? `Aceptada el ${new Date(inv.used_at).toLocaleDateString('es-ES')}` :
             status === 'expired' ? `Expiró el ${new Date(inv.expires_at).toLocaleDateString('es-ES')}` :
             `Expira el ${new Date(inv.expires_at).toLocaleDateString('es-ES')}`}
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
          style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {statusStyle.label}
        </span>
      </div>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="text-xs px-2.5 py-1 rounded-lg border transition flex-shrink-0"
      style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
      Copiar
    </button>
  )
}
