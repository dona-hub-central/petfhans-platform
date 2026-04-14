import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

const VISIT_TYPE: Record<string, { label: string; color: string }> = {
  consultation: { label: '🩺 Consulta',    color: '#2563eb' },
  emergency:    { label: '🚨 Urgencia',    color: '#dc2626' },
  surgery:      { label: '🔪 Cirugía',     color: '#7c3aed' },
  followup:     { label: '🔄 Seguimiento', color: '#0891b2' },
  vaccination:  { label: '💉 Vacunación',  color: '#16a34a' },
  checkup:      { label: '✅ Control',     color: '#d97706' },
}

const SYSTEM_COLORS: Record<string, string> = {
  Normal: '#16a34a', Leve: '#d97706', Moderado: '#ea580c', Grave: '#dc2626', 'N/E': '#64748b'
}

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

  const meds     = Array.isArray(r.medications) ? r.medications : []
  const vaccines = Array.isArray(r.vaccines)    ? r.vaccines    : []
  const exam     = r.physical_exam ?? {}
  const vt       = VISIT_TYPE[r.visit_type] ?? VISIT_TYPE.consultation

  const SYSTEMS = [
    ['cardiovascular',  'Cardiovascular'],
    ['respiratory',     'Respiratorio'],
    ['digestive',       'Digestivo'],
    ['musculoskeletal', 'Locomotor'],
    ['skin',            'Piel y anejos'],
    ['lymph_nodes',     'Ganglios'],
  ]

  return (
    <VetLayout clinicName={(profile as any)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>

      {/* Nav + acciones */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/vet/pets/${r.pets?.id}`} className="text-xs" style={{ color: 'var(--muted)' }}>
            ← {r.pets?.name}
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Consulta</span>
        </div>
        <Link href={`/vet/records/new?pet=${r.pets?.id}`} className="btn-pf px-4 py-2 text-sm inline-flex items-center gap-1.5">
          + Nueva consulta
        </Link>
      </div>

      <div className="space-y-4">

        {/* Cabecera */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{ background: vt.color + '15', color: vt.color }}>{vt.label}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(r.visit_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{r.reason}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Dr/a. {(r.profiles as any)?.full_name}</p>
            </div>
            {r.next_visit && (
              <div className="text-center flex-shrink-0 px-4 py-3 rounded-xl"
                style={{ background: 'var(--accent-s)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Próxima visita</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text)' }}>
                  {new Date(r.next_visit).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Exploración física */}
          {(exam.weight || exam.temperature || exam.heart_rate || exam.respiratory_rate || exam.general_state) && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>🩺 Exploración física</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-4">
                {[
                  ['Peso', exam.weight ? `${exam.weight} kg` : null],
                  ['Temperatura', exam.temperature ? `${exam.temperature} °C` : null],
                  ['Frec. cardíaca', exam.heart_rate ? `${exam.heart_rate} lpm` : null],
                  ['Frec. respiratoria', exam.respiratory_rate ? `${exam.respiratory_rate} rpm` : null],
                  ['Estado general', exam.general_state],
                  ['Mucosas', exam.mucous],
                  ['Hidratación', exam.hydration],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Sistemas */}
              {SYSTEMS.some(([k]) => exam[k]) && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Sistemas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SYSTEMS.filter(([k]) => exam[k]).map(([k, label]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: (SYSTEM_COLORS[exam[k]] || '#64748b') + '18', color: SYSTEM_COLORS[exam[k]] || '#64748b' }}>
                          {exam[k]}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {exam.other && <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{exam.other}</p>}
            </div>
          )}

          {/* Diagnóstico y pronóstico */}
          {(r.diagnosis || r.prognosis || r.treatment) && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>📝 Diagnóstico y tratamiento</h3>
              {r.diagnosis && (
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Diagnóstico</p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{r.diagnosis}</p>
                </div>
              )}
              {r.prognosis && (
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Pronóstico</p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{r.prognosis}</p>
                </div>
              )}
              {r.treatment && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Tratamiento</p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{r.treatment}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Medicamentos */}
        {meds.length > 0 && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>💊 Medicamentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {meds.map((m: any, i: number) => (
                <div key={i} className="rounded-xl p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {m.dose      && <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#eff6ff', color: '#2563eb' }}>{m.dose}</span>}
                    {m.route     && <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#f0fdf4', color: '#16a34a' }}>{m.route}</span>}
                    {m.frequency && <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#fff7ed', color: '#d97706' }}>{m.frequency}</span>}
                    {m.duration  && <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#faf5ff', color: '#7c3aed' }}>{m.duration}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vacunas */}
        {vaccines.length > 0 && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>💉 Vacunación</h3>
            <div className="space-y-2">
              {vaccines.map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <span className="text-lg">💉</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{v.name}</p>
                    {v.lot && <p className="text-xs" style={{ color: 'var(--muted)' }}>Lote: {v.lot}</p>}
                  </div>
                  {v.next_date && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Próxima dosis</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        {new Date(v.next_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {r.notes && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>📌 Notas</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{r.notes}</p>
          </div>
        )}

      </div>
    </VetLayout>
  )
}
