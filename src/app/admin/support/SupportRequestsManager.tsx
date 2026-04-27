'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, MessageCircle, Mail, Phone, Calendar } from 'lucide-react'

type SupportRequest = {
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
  requester_name: string | null
  requester_role: string | null
}

const STATUS_LABEL: Record<SupportRequest['status'], { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',   bg: '#fff8e6', color: '#b07800' },
  reviewing: { label: 'En revisión', bg: '#eff6ff', color: '#2563eb' },
  approved:  { label: 'Aprobado',    bg: '#edfaf1', color: '#1a7a3c' },
  rejected:  { label: 'Rechazado',   bg: '#fef2f2', color: '#dc2626' },
}

export default function SupportRequestsManager({ requests }: { requests: SupportRequest[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | SupportRequest['status']>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const visible = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const updateRequest = async (id: string, patch: Partial<Pick<SupportRequest, 'status' | 'admin_notes'>>) => {
    setBusy(id)
    const res = await fetch(`/api/support/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) router.refresh()
    setBusy(null)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'pending', 'reviewing', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
            style={{
              borderColor: filter === f ? 'var(--pf-coral)' : 'var(--pf-border)',
              background:  filter === f ? 'var(--pf-coral-soft)' : '#fff',
              color:       filter === f ? 'var(--pf-coral-dark)' : 'var(--pf-muted)',
            }}>
            {f === 'all' ? 'Todas' : STATUS_LABEL[f].label}
            <span className="ml-1.5 opacity-60">
              ({f === 'all' ? requests.length : requests.filter(r => r.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <p className="text-sm" style={{ color: 'var(--pf-muted)' }}>No hay solicitudes en esta vista</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const status = STATUS_LABEL[r.status]
            const Icon = r.type === 'clinic_creation' ? Building2 : MessageCircle
            const isOpen = openId === r.id

            return (
              <div key={r.id} className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--pf-border)' }}>
                <button onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--pf-ink)' }}>{r.subject}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: status.bg, color: status.color }}>{status.label}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--pf-muted)' }}>
                      {r.requester_name ?? r.contact_email} · {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {r.clinic_name ? ` · ${r.clinic_name}` : ''}
                    </p>
                  </div>
                  <span style={{ color: 'var(--pf-hint)', flexShrink: 0 }}>{isOpen ? '−' : '›'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--pf-border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 text-xs" style={{ color: 'var(--pf-muted)' }}>
                      <div className="flex items-center gap-1.5"><Mail size={12} /> {r.contact_email}</div>
                      {r.contact_phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {r.contact_phone}</div>}
                      <div className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(r.created_at).toLocaleString('es-ES')}</div>
                      {r.requester_role && <div>Rol actual: <strong>{r.requester_role}</strong></div>}
                    </div>

                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>MENSAJE</p>
                    <p className="text-sm whitespace-pre-wrap mb-4" style={{ color: 'var(--pf-ink)' }}>{r.message}</p>

                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--pf-muted)' }}>NOTAS INTERNAS</p>
                    <textarea
                      value={notesDraft[r.id] ?? r.admin_notes ?? ''}
                      onChange={e => setNotesDraft(d => ({ ...d, [r.id]: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3"
                      style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
                      placeholder="Notas para el equipo..."
                    />

                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'reviewing', 'approved', 'rejected'] as const).map(s => (
                        <button key={s} onClick={() => updateRequest(r.id, {
                          status: s,
                          admin_notes: notesDraft[r.id] ?? r.admin_notes ?? null,
                        })}
                          disabled={busy === r.id || r.status === s}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-40"
                          style={{
                            borderColor: r.status === s ? STATUS_LABEL[s].color : 'var(--pf-border)',
                            background: r.status === s ? STATUS_LABEL[s].bg : '#fff',
                            color: r.status === s ? STATUS_LABEL[s].color : 'var(--pf-ink)',
                          }}>
                          {STATUS_LABEL[s].label}
                        </button>
                      ))}
                      {r.type === 'clinic_creation' && (
                        <a href={`/admin/clinics/new?prefill_name=${encodeURIComponent(r.clinic_name ?? '')}&prefill_email=${encodeURIComponent(r.contact_email)}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition ml-auto"
                          style={{ borderColor: 'var(--pf-coral)', color: 'var(--pf-coral)' }}>
                          → Crear clínica
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
