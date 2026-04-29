import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function ClinicNotFound() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--pf-surface)', color: 'var(--pf-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Building2 size={24} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Clínica no encontrada
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 22px', lineHeight: 1.6 }}>
          Esta clínica no existe en el sistema.
        </p>
        <Link href="/admin/clinics" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, background: 'var(--pf-coral)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
          Ver clínicas
        </Link>
      </div>
    </div>
  )
}
