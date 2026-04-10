import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

export default async function RecordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: records } = await admin.from('medical_records')
    .select('*, pets(name, species), profiles!medical_records_vet_id_fkey(full_name)')
    .eq('clinic_id', profile?.clinic_id)
    .order('visit_date', { ascending: false })

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Consultas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{records?.length ?? 0} registros</p>
        </div>
        <Link href="/vet/records/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva consulta
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {records && records.length > 0 ? records.map((r: any) => (
            <Link key={r.id} href={`/vet/records/${r.id}`}
              className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition block">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'var(--accent-s)' }}>
                {speciesIcon[r.pets?.species] ?? '🐾'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.pets?.name}</p>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>·</span>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.reason}</p>
                </div>
                {r.diagnosis && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>Dx: {r.diagnosis}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {(r.profiles as any)?.full_name?.split(' ')[0]}
                </p>
              </div>
            </Link>
          )) : (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>Sin consultas aún</p>
              <Link href="/vet/records/new" className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--accent)' }}>
                Registrar primera consulta →
              </Link>
            </div>
          )}
        </div>
      </div>
    </VetLayout>
  )
}
