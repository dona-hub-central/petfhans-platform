import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: r } = await admin.from('medical_records')
    .select('*, pets(id, name, species, breed), profiles!medical_records_vet_id_fkey(full_name)')
    .eq('id', id).single()

  if (!r) redirect('/vet/records')

  const meds = Array.isArray(r.medications) ? r.medications : []

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/vet/pets/${r.pets?.id}`} className="text-xs" style={{ color: 'var(--muted)' }}>
          ← {r.pets?.name}
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Consulta</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                  {new Date(r.visit_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h2 className="text-xl font-bold mt-3" style={{ color: 'var(--text)' }}>{r.reason}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Dr. {(r.profiles as any)?.full_name}
                </p>
              </div>
              <Link href={`/vet/records/new?pet=${r.pets?.id}`}
                className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                + Nueva consulta
              </Link>
            </div>
          </div>

          {/* Diagnóstico y tratamiento */}
          {(r.diagnosis || r.treatment) && (
            <div className="grid grid-cols-2 gap-4">
              {r.diagnosis && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Diagnóstico</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{r.diagnosis}</p>
                </div>
              )}
              {r.treatment && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Tratamiento</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{r.treatment}</p>
                </div>
              )}
            </div>
          )}

          {/* Medicamentos */}
          {meds.length > 0 && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Medicamentos</p>
              <div className="space-y-2">
                {meds.map((med: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--bg)' }}>
                    <span className="text-lg">💊</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{med.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {med.dose} · {med.frequency} · {med.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {r.notes && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Notas</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{r.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Paciente</p>
            <Link href={`/vet/pets/${r.pets?.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: 'var(--accent-s)' }}>
                {r.pets?.species === 'dog' ? '🐶' : r.pets?.species === 'cat' ? '🐱' : r.pets?.species === 'rabbit' ? '🐰' : '🐾'}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.pets?.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.pets?.breed ?? r.pets?.species}</p>
              </div>
            </Link>
          </div>

          {r.next_visit && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Próxima visita</p>
              <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                📅 {new Date(r.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </VetLayout>
  )
}
