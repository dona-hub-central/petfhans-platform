import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { PawPrint, ClipboardCheck, Mail, Plus, ClipboardList, Sparkles, type LucideIcon } from 'lucide-react'
import type { RecordListItem } from '@/types'

export const metadata = { title: 'Dashboard · Petfhans', description: 'Panel de gestión de tu clínica veterinaria.' }

export default async function VetDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { count: petCount } = await admin.from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .eq('is_active', true)

  const { data: recentRecords } = await admin.from('medical_records')
    .select('*, pets(name, species)')
    .eq('clinic_id', profile?.clinic_id)
    .order('visit_date', { ascending: false })
    .limit(5)

  const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
  const { count: weekRecords } = await admin.from('medical_records')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .gte('visit_date', sevenDaysAgo)

  const { count: invCount } = await admin.from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())

  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .qa-card { background:var(--pf-white); border:0.5px solid var(--pf-border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; text-decoration:none; transition:border-color 0.2s, box-shadow 0.2s; }
        .qa-card:hover { border-color:var(--pf-coral-mid); box-shadow:var(--pf-shadow-card-hover); }
        .recent-row { display:flex; align-items:center; gap:12px; padding:14px 20px; text-decoration:none; border-top:0.5px solid var(--pf-border); transition:background 0.15s; }
        .recent-row:hover { background:var(--pf-bg); }
        @media (max-width:767px) {
          .dash-actions { grid-template-columns:repeat(2,1fr) !important; }
          .dash-stats > div { padding:12px 10px !important; }
          .dash-stats > div > div:first-child { width:30px !important; height:30px !important; border-radius:8px !important; margin-bottom:6px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ font: 'var(--pf-text-display)', margin: 0, letterSpacing: '-0.01em', color: 'var(--pf-ink)' }}>
          Hola, {firstName}
        </h1>
        <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '6px 0 0', textTransform: 'capitalize' }}>{today}</p>
      </header>

      {/* Stats */}
      <section className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard Icon={PawPrint}       label="Pacientes activos"     value={petCount ?? 0}   tint="coral"  delay={0} />
        <StatCard Icon={ClipboardCheck} label="Consultas esta semana" value={weekRecords ?? 0} tint="mint"   delay={80} />
        <StatCard Icon={Mail}           label="Invitaciones activas"  value={invCount ?? 0}   tint="amber"  delay={160} />
      </section>

      {/* Quick actions */}
      <h2 style={{ font: 'var(--pf-text-h2)', color: 'var(--pf-ink)', margin: '0 0 12px' }}>Acciones rápidas</h2>
      <section className="dash-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        <QuickAction href="/vet/pets/new"       Icon={Plus}          title="Nueva mascota"  desc="Registrar paciente" tint="coral" />
        <QuickAction href="/vet/records/new"    Icon={ClipboardList} title="Nueva consulta" desc="Registrar consulta" tint="coral" />
        <QuickAction href="/vet/invitations/new" Icon={Mail}         title="Invitar dueño"  desc="Enviar link acceso" tint="coral" />
        <QuickAction href="/vet/ai"              Icon={Sparkles}     title="IA Clínica"     desc="Análisis con IA"    tint="purple" />
      </section>

      {/* Recent records */}
      <section style={{ background: 'var(--pf-white)', borderRadius: 14, border: '0.5px solid var(--pf-border)', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <h3 style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0 }}>Consultas recientes</h3>
          <Link href="/vet/records" style={{ font: 'var(--pf-text-accent)', color: 'var(--pf-coral)', textDecoration: 'none' }}>Ver todas →</Link>
        </header>
        {recentRecords && recentRecords.length > 0 ? (recentRecords as RecordListItem[]).map((r) => (
          <Link key={r.id} href={`/vet/records/${r.id}`} className="recent-row">
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--pf-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              <PawPrint size={18} strokeWidth={1.75} style={{ color: 'var(--pf-coral)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ font: 'var(--pf-text-body)', fontWeight: 500, color: 'var(--pf-ink)', margin: 0 }}>{r.pets?.name}</p>
              <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>{r.reason}</p>
            </div>
            <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', flexShrink: 0 }}>
              {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
            <span style={{ color: 'var(--pf-hint)', marginLeft: 4 }}>›</span>
          </Link>
        )) : (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)' }}>No hay consultas aún</p>
          </div>
        )}
      </section>
    </>
  )
}

const tintMap = {
  coral:  { bg: 'var(--pf-coral-soft)',  fg: 'var(--pf-coral)' },
  mint:   { bg: 'var(--pf-success)',     fg: 'var(--pf-success-fg)' },
  amber:  { bg: 'var(--pf-warning)',     fg: 'var(--pf-warning-fg)' },
  purple: { bg: 'var(--pf-info)',        fg: 'var(--pf-info-fg)' },
} as const

function StatCard({ Icon, label, value, tint, delay }: { Icon: LucideIcon; label: string; value: number; tint: keyof typeof tintMap; delay: number }) {
  const { bg, fg } = tintMap[tint]
  return (
    <div style={{ background: 'var(--pf-white)', border: '0.5px solid var(--pf-border)', borderRadius: 14, padding: '18px 20px', animation: `fadeUp 0.5s ${delay}ms both` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: bg, color: fg }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div style={{ font: 'var(--pf-text-display)', fontSize: 26, color: 'var(--pf-ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function QuickAction({ href, Icon, title, desc, tint }: { href: string; Icon: LucideIcon; title: string; desc: string; tint: keyof typeof tintMap }) {
  const { bg, fg } = tintMap[tint]
  return (
    <Link href={href} className="qa-card">
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div>
        <div style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)' }}>{title}</div>
        <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>{desc}</p>
      </div>
    </Link>
  )
}
