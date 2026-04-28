import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import AgentConfig from './AgentConfig'
import { PawPrint, ClipboardList, Building2, Sparkles } from 'lucide-react'

export default async function AgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const { data: agent } = await admin.from('ai_agent').select('*').eq('id', 'default').single()

  // Stats para el agente
  const [{ count: totalPets }, { count: totalRecords }, { count: totalClinics }] = await Promise.all([
    admin.from('pets').select('*', { count: 'exact', head: true }),
    admin.from('medical_records').select('*', { count: 'exact', head: true }),
    admin.from('clinics').select('*', { count: 'exact', head: true }),
  ])

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="adm-pg">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--pf-info)', color: 'var(--pf-info-fg)' }}>
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>
              {agent?.name ?? 'Dr. Petfhans'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--pf-muted)' }}>
              Agente veterinario experto con IA
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: agent?.is_active ? '#edfaf1' : '#fee2e2',
                color: agent?.is_active ? '#1a7a3c' : '#dc2626',
              }}>
              {agent?.is_active ? '● Activo' : '○ Inactivo'}
            </span>
          </div>
        </div>

        {/* Stats de acceso a BD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {([
            { Icon: PawPrint,      label: 'Mascotas en BD',  value: totalPets ?? 0 },
            { Icon: ClipboardList, label: 'Consultas en BD', value: totalRecords ?? 0 },
            { Icon: Building2,     label: 'Clínicas',        value: totalClinics ?? 0 },
          ] as const).map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-5 flex items-center gap-4"
              style={{ borderColor: 'var(--pf-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                <s.Icon size={18} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--pf-ink)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <AgentConfig agent={agent} />
      </div>
    </AdminLayout>
  )
}
