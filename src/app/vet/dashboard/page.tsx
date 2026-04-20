import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'

export const metadata = { title: 'Dashboard · Petfhans', description: 'Panel de gestión de tu clínica veterinaria.' }

export default async function VetDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

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

  const { count: weekRecords } = await admin.from('medical_records')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .gte('visit_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])

  const { count: invCount } = await admin.from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())

  const clinicName = (profile as any)?.clinics?.name ?? ''
  const userName = profile?.full_name ?? ''
  const firstName = userName.split(' ')[0]
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .qa-card { background:var(--pf-white); border:0.5px solid var(--pf-border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; text-decoration:none; transition:all 0.2s; }
        .qa-card:hover { border-color:var(--pf-coral-mid); box-shadow:0 2px 16px rgba(238,114,109,.09); }
        .recent-row { display:flex; align-items:center; gap:12px; padding:14px 20px; text-decoration:none; border-top:0.5px solid var(--pf-border); transition:background 0.15s; }
        .recent-row:hover { background:var(--pf-bg); }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 32, color: 'var(--pf-ink)', margin: 0, letterSpacing: '-0.01em' }}>
          Hola, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '6px 0 0', textTransform: 'capitalize' }}>{today}</p>
      </header>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard icon="paw"     label="Pacientes activos"     value={petCount ?? 0}       tint="coral"  delay={0} />
        <StatCard icon="check"   label="Consultas esta semana" value={weekRecords ?? 0}     tint="mint"   delay={80} />
        <StatCard icon="mail"    label="Invitaciones activas"  value={invCount ?? 0}        tint="amber"  delay={160} />
      </section>

      {/* Quick actions */}
      <h2 style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 18, color: 'var(--pf-ink)', margin: '0 0 12px' }}>Acciones rápidas</h2>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        <QuickAction href="/vet/pets/new"         icon="plus"      title="Nueva mascota"  desc="Registrar paciente" tint="coral" />
        <QuickAction href="/vet/records/new"       icon="clipboard" title="Nueva consulta" desc="Registrar consulta" tint="coral" />
        <QuickAction href="/vet/invitations/new"   icon="mail"      title="Invitar dueño"  desc="Enviar link acceso" tint="coral" />
        <QuickAction href="/vet/ai"                icon="sparkles"  title="IA Clínica"     desc="Análisis con IA"    tint="purple" />
      </section>

      {/* Recent records */}
      <section style={{ background: 'var(--pf-white)', borderRadius: 14, border: '0.5px solid var(--pf-border)', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--pf-ink)', margin: 0 }}>Consultas recientes</h3>
          <Link href="/vet/records" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pf-coral)', textDecoration: 'none' }}>Ver todas →</Link>
        </header>
        {recentRecords && recentRecords.length > 0 ? recentRecords.map((r: any) => (
          <Link key={r.id} href={`/vet/records/${r.id}`} className="recent-row">
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--pf-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {r.pets?.species === 'dog' ? '🐶' : r.pets?.species === 'cat' ? '🐱' : r.pets?.species === 'rabbit' ? '🐰' : '🐾'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--pf-ink)', margin: 0 }}>{r.pets?.name}</p>
              <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: '2px 0 0' }}>{r.reason}</p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--pf-muted)', flexShrink: 0 }}>
              {new Date(r.visit_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
            <span style={{ color: 'var(--pf-muted)', marginLeft: 4 }}>›</span>
          </Link>
        )) : (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--pf-muted)' }}>No hay consultas aún</p>
          </div>
        )}
      </section>
    </VetLayout>
  )
}

function StatIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'paw')     return <svg {...common}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 20a4 4 0 0 1 8 0"/></svg>
  if (name === 'check')   return <svg {...common}><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  if (name === 'mail')    return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
  if (name === 'plus')    return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg>
  if (name === 'sparkles') return <svg {...common}><path d="m12 3-1.9 5.8L4 10l5.8 1.9L11.9 18l1.9-5.8L20 10.3l-5.8-1.9z"/></svg>
  return null
}

const tintMap = {
  coral:  { bg: 'var(--pf-coral-soft)',  fg: 'var(--pf-coral)' },
  mint:   { bg: 'var(--pf-success)',     fg: 'var(--pf-success-fg)' },
  amber:  { bg: 'var(--pf-warning)',     fg: 'var(--pf-warning-fg)' },
  purple: { bg: 'var(--pf-info)',        fg: 'var(--pf-info-fg)' },
} as const

function StatCard({ icon, label, value, tint, delay }: { icon: string; label: string; value: number; tint: keyof typeof tintMap; delay: number }) {
  const { bg, fg } = tintMap[tint]
  return (
    <div style={{ background: 'var(--pf-white)', border: '0.5px solid var(--pf-border)', borderRadius: 14, padding: '18px 20px', animation: `fadeUp 0.5s ${delay}ms both` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: bg, color: fg }}>
        <StatIcon name={icon} />
      </div>
      <div style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 26, color: 'var(--pf-ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--pf-muted)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function QuickAction({ href, icon, title, desc, tint }: { href: string; icon: string; title: string; desc: string; tint: keyof typeof tintMap }) {
  const { bg, fg } = tintMap[tint]
  return (
    <Link href={href} className="qa-card">
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatIcon name={icon} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-ink)' }}>{title}</div>
        <p style={{ fontSize: 12, color: 'var(--pf-muted)', margin: '2px 0 0' }}>{desc}</p>
      </div>
    </Link>
  )
}
