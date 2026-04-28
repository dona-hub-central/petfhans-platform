import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import SupportRequestsManager from './SupportRequestsManager'

export const metadata = { title: 'Soporte · Admin Petfhans' }

type SupportRequestRow = {
  id: string
  user_id: string
  type: 'clinic_creation' | 'general'
  subject: string
  message: string
  clinic_name: string | null
  contact_phone: string | null
  contact_email: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

export default async function AdminSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('role, full_name').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')
  const { data: requests } = await admin.from('support_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const rows = (requests ?? []) as SupportRequestRow[]
  const userIds = Array.from(new Set(rows.map(r => r.user_id)))
  const { data: profiles } = userIds.length > 0
    ? await admin.from('profiles').select('user_id, full_name, role').in('user_id', userIds)
    : { data: [] }
  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id, { full_name: p.full_name, role: p.role }])
  )

  const enriched = rows.map(r => ({
    ...r,
    requester_name: profileMap.get(r.user_id)?.full_name ?? null,
    requester_role: profileMap.get(r.user_id)?.role ?? null,
  }))

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="adm-pg">
        <div className="pf-page-hdr mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Solicitudes de soporte</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
              Verifica clínicas y veterinarios antes de habilitar el acceso
            </p>
          </div>
        </div>

        <SupportRequestsManager requests={enriched} />
      </div>
    </AdminLayout>
  )
}
