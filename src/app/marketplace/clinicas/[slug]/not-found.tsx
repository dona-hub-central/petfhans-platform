import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function ClinicProfileNotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--pf-surface)', color: 'var(--pf-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Building2 size={26} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Clínica no encontrada
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 22px', lineHeight: 1.6 }}>
          Esta clínica no está disponible en el Marketplace.
        </p>
        <Link href="/marketplace/clinicas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 12, background: 'var(--pf-coral)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
          Ver clínicas
        </Link>
      </div>
    </div>
  )
}
