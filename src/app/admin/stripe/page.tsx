import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import StripeConfig from './StripeConfig'
import CopyButton from './CopyButton'

export default async function StripePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  const hasSecretKey  = !!process.env.STRIPE_SECRET_KEY
  const hasPublicKey  = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  return (
    <AdminLayout userName={profile?.full_name ?? 'Admin'}>
      <div className="adm-pg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Configuración Stripe</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
            Gestiona la integración de pagos con Stripe
          </p>
        </div>

        {/* Estado actual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatusCard
            icon="🔑"
            label="Clave secreta (STRIPE_SECRET_KEY)"
            connected={hasSecretKey}
          />
          <StatusCard
            icon="🌐"
            label="Clave pública (STRIPE_PUBLISHABLE_KEY)"
            connected={hasPublicKey}
          />
        </div>

        <StripeConfig hasSecretKey={hasSecretKey} hasPublicKey={hasPublicKey} />

        {/* Info Webhooks */}
        <div className="mt-6 bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--pf-ink)' }}>
            ⚡ Webhook endpoint
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--pf-muted)' }}>
            Configura este endpoint en tu dashboard de Stripe para recibir eventos de pago:
          </p>
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--pf-bg)' }}>
            <code className="text-sm flex-1" style={{ color: 'var(--pf-ink)', wordBreak: 'break-all' }}>
              https://petfhans.com/api/stripe/webhook
            </code>
            <CopyButton text="https://petfhans.com/api/stripe/webhook" />
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium" style={{ color: 'var(--pf-ink)' }}>Eventos a escuchar:</p>
            {[
              'customer.subscription.created',
              'customer.subscription.updated',
              'customer.subscription.deleted',
              'invoice.payment_succeeded',
              'invoice.payment_failed',
            ].map(e => (
              <div key={e} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#1a7a3c' }}>✓</span>
                <code className="text-xs" style={{ color: 'var(--pf-muted)' }}>{e}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Link a dashboard Stripe */}
        <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl border" style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-bg)' }}>
          <span className="text-xl">⚡</span>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--pf-ink)' }}>Dashboard de Stripe</p>
            <p className="text-xs" style={{ color: 'var(--pf-muted)' }}>Gestiona clientes, pagos y suscripciones</p>
          </div>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
            className="btn-pf text-xs px-4 py-2 inline-flex items-center gap-1">
            Abrir ↗
          </a>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatusCard({ icon, label, connected }: { icon: string; label: string; connected: boolean }) {
  return (
    <div className="bg-white rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: 'var(--pf-border)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: connected ? '#edfaf1' : '#fee2e2' }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--pf-ink)' }}>{label}</p>
        <p className="text-xs mt-0.5 font-semibold" style={{ color: connected ? '#1a7a3c' : '#dc2626' }}>
          {connected ? '✓ Configurada' : '✗ No configurada'}
        </p>
      </div>
    </div>
  )
}

