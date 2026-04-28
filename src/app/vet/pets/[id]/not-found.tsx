import Link from 'next/link'
import { PawPrint } from 'lucide-react'

export default function PetNotFound() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <PawPrint size={24} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontFamily: 'var(--pf-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 8px' }}>
          Mascota no encontrada
        </h2>
        <p style={{ fontFamily: 'var(--pf-font-body)', fontSize: 13, color: 'var(--pf-muted)', margin: '0 0 22px', lineHeight: 1.6 }}>
          Este paciente no existe en tu clínica o fue dado de baja.
        </p>
        <Link href="/vet/pets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, background: 'var(--pf-coral)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--pf-font-body)' }}>
          Ver pacientes
        </Link>
      </div>
    </div>
  )
}
