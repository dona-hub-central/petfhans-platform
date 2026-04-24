import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { PawPrint, ClipboardList } from 'lucide-react'
import type { RecordListItem } from '@/types'

const VISIT_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  consultation: { label: 'Consulta',    color: '#2563eb' },
  emergency:    { label: 'Urgencia',    color: '#dc2626' },
  surgery:      { label: 'Cirugía',     color: '#7c3aed' },
  followup:     { label: 'Seguimiento', color: '#0891b2' },
  vaccination:  { label: 'Vacunación',  color: '#16a34a' },
  checkup:      { label: 'Control',     color: '#d97706' },
}

export default async function RecordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: records } = await admin.from('medical_records')
    .select('*, pets(id, name, species), profiles!medical_records_vet_id_fkey(full_name)')
    .eq('clinic_id', profile?.clinic_id)
    .order('visit_date', { ascending: false })

  return (
    <>
      <div className="pf-page-hdr mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Consultas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{records?.length ?? 0} registros</p>
        </div>
        <Link href="/vet/records/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
          + Nueva consulta
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)' }}>
        {records && records.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--pf-border)' }}>
            {(records as RecordListItem[]).map((r) => {
              const vt = VISIT_TYPE_LABEL[r.visit_type] ?? VISIT_TYPE_LABEL.consultation
              return (
                <Link key={r.id} href={`/vet/records/${r.id}`}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition block">
                  {/* Fecha */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-lg font-bold leading-tight" style={{ color: 'var(--pf-ink)' }}>
                      {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit' })}
                    </p>
                    <p className="text-xs uppercase" style={{ color: 'var(--pf-muted)' }}>
                      {new Date(r.visit_date).toLocaleDateString('es-ES', { month: 'short' })}
                    </p>
                  </div>

                  {/* Icono mascota */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                    <PawPrint size={18} strokeWidth={1.75} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: vt.color + '15', color: vt.color }}>
                        {vt.label}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--pf-ink)' }}>
                        {r.pets?.name}
                      </span>
                    </div>
                    <p className="text-sm truncate" style={{ color: 'var(--pf-ink)' }}>{r.reason}</p>
                    {r.diagnosis && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--pf-muted)' }}>Dx: {r.diagnosis}</p>
                    )}
                  </div>

                  <span className="text-lg flex-shrink-0" style={{ color: 'var(--pf-border)' }}>›</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-muted)' }}>
              <ClipboardList size={40} strokeWidth={1.5} />
            </div>
            <p className="font-medium text-sm mb-2" style={{ color: 'var(--pf-ink)' }}>Sin consultas registradas</p>
            <Link href="/vet/records/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
              + Nueva consulta
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
