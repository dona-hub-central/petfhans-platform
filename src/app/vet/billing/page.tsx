import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import VetLayout from '@/components/shared/VetLayout'
import { XCircle, AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Facturación · Petfhans' }

const PLAN_LABELS: Record<string, string> = {
  free:  'Gratuito',
  basic: 'Básico',
  pro:   'Pro',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free:  'Hasta 10 pacientes. Funciones esenciales.',
  basic: 'Hasta 50 pacientes. Historial médico completo.',
  pro:   'Pacientes ilimitados. IA clínica + análisis avanzado.',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: clinic } = await admin.from('clinics')
    .select('name, subscription_plan, subscription_status, max_patients, stripe_customer_id')
    .eq('id', profile?.clinic_id)
    .single()

  const { count: petCount } = await admin.from('pets')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', profile?.clinic_id)
    .eq('is_active', true)

  const clinicName = (profile as { clinics?: { name: string } | null } | null)?.clinics?.name ?? ''
  const userName   = profile?.full_name ?? ''

  const count   = petCount ?? 0
  const maxPats = (clinic as { max_patients?: number } | null)?.max_patients ?? 10
  const pct     = maxPats > 0 ? Math.min((count / maxPats) * 100, 100) : 0
  const plan    = (clinic as { subscription_plan?: string } | null)?.subscription_plan ?? 'free'
  const status  = (clinic as { subscription_status?: string } | null)?.subscription_status ?? 'inactive'
  const stripeId = (clinic as { stripe_customer_id?: string | null } | null)?.stripe_customer_id

  const barColor = pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : 'var(--pf-coral)'

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--pf-ink)' }}>Facturación y plan</h1>

        {/* Alert: at limit */}
        {pct >= 100 && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <XCircle size={20} strokeWidth={2} style={{ color: '#dc2626', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Límite de pacientes alcanzado</p>
              <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>
                No puedes registrar nuevos pacientes hasta que mejores tu plan.
              </p>
            </div>
          </div>
        )}

        {/* Alert: approaching limit (80–99%) */}
        {pct >= 80 && pct < 100 && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <AlertTriangle size={20} strokeWidth={2} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#d97706' }}>Casi en el límite</p>
              <p className="text-xs mt-0.5" style={{ color: '#d97706' }}>
                Has usado el {Math.round(pct)}% de tu cuota de pacientes. Considera mejorar tu plan pronto.
              </p>
            </div>
          </div>
        )}

        {/* Plan info */}
        <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: 'var(--pf-border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--pf-muted)' }}>Plan actual</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>{PLAN_LABELS[plan] ?? plan}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>{PLAN_DESCRIPTIONS[plan] ?? ''}</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: status === 'active' ? '#edfaf1' : status === 'trial' ? '#fffbeb' : '#fef2f2',
                color:      status === 'active' ? '#1a7a3c' : status === 'trial' ? '#d97706' : '#dc2626',
              }}>
              {status === 'active' ? 'Activo' : status === 'trial' ? 'Periodo de prueba' : 'Inactivo'}
            </span>
          </div>

          {/* Usage bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--pf-ink)' }}>Uso de pacientes</p>
              <p className="text-sm font-bold" style={{ color: barColor }}>
                {count} / {maxPats}
              </p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--pf-bg)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--pf-muted)' }}>
              {maxPats - count > 0 ? `${maxPats - count} pacientes disponibles` : 'Sin cuota disponible'}
            </p>
          </div>
        </div>

        {/* Stripe portal / upgrade */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h2 className="font-semibold mb-1" style={{ color: 'var(--pf-ink)' }}>Gestionar suscripción</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--pf-muted)' }}>
            Cambia de plan, actualiza tu método de pago o descarga facturas.
          </p>
          {stripeId ? (
            <a href="/api/stripe/portal"
              className="btn-pf px-5 py-2.5 text-sm inline-block">
              Ir al portal de facturación →
            </a>
          ) : (
            <p className="text-sm px-4 py-3 rounded-xl" style={{ background: 'var(--pf-bg)', color: 'var(--pf-muted)' }}>
              Contacta con soporte en <strong>soporte@petfhans.com</strong> para gestionar tu plan.
            </p>
          )}
        </div>
      </div>
    </VetLayout>
  )
}
