import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PawPrint, ChevronRight } from 'lucide-react'
import type { Pet } from '@/types'

export const metadata = { title: 'Pedir cita · Petfhans' }

const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

export default async function NewAppointmentPicker() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')
  const { data: access } = await admin.from('pet_access')
    .select('pet_id').eq('owner_id', profile.id)
  const petIds = (access ?? []).map(a => a.pet_id)

  let pets: Pet[] = []
  if (petIds.length > 0) {
    const { data } = await admin.from('pets')
      .select('*').in('id', petIds).eq('is_active', true)
    pets = (data ?? []) as Pet[]
  }

  // Single pet → skip the picker.
  if (pets.length === 1) redirect(`/owner/pets/${pets[0].id}#book`)

  return (
    <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 16px 24px', maxWidth: 560, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ font: 'var(--pf-text-display)', margin: 0, color: 'var(--pf-ink)', fontSize: 24 }}>Pedir cita</h1>
        <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '6px 0 0' }}>
          Elige la mascota para la consulta
        </p>
      </header>

      {pets.length === 0 ? (
        <div style={{
          background: 'var(--pf-white)', borderRadius: 20,
          border: '0.5px solid var(--pf-border)', padding: '48px 20px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-coral)' }}>
            <PawPrint size={42} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--pf-ink)', margin: '0 0 6px' }}>
            Aún no tienes mascotas
          </p>
          <p style={{ fontSize: 14, color: 'var(--pf-muted)', margin: '0 0 16px' }}>
            Registra a tu compañero para poder pedir cita
          </p>
          <Link href="/owner/pets/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--pf-coral)', color: '#fff',
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}>
            Añadir mascota
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pets.map(pet => (
            <Link key={pet.id} href={`/owner/pets/${pet.id}#book`}
              style={{
                background: 'var(--pf-white)', borderRadius: 16,
                border: '0.5px solid var(--pf-border)',
                padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                textDecoration: 'none',
              }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <PawPrint size={22} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ font: 'var(--pf-text-body)', fontWeight: 600, color: 'var(--pf-ink)', margin: 0 }}>
                  {pet.name}
                </p>
                <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>
                  {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                </p>
              </div>
              <ChevronRight size={18} strokeWidth={2} style={{ color: 'var(--pf-hint)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
