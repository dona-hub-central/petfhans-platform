import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BookingWizard from '@/components/owner/BookingWizard'
import type { ClinicPublicProfile } from '@/types'

export const metadata = { title: 'Pedir cita · Petfhans' }

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  // Pets via pet_access (clinic-linked) + directly owned pets
  const [{ data: accessRows }, { data: ownedRows }] = await Promise.all([
    admin.from('pet_access').select('pet_id').eq('owner_id', profile.id),
    admin.from('pets').select('id').eq('owner_id', profile.id).eq('is_active', true),
  ])

  const allPetIds = [
    ...new Set([
      ...(accessRows ?? []).map((a: { pet_id: string }) => a.pet_id),
      ...(ownedRows  ?? []).map((p: { id: string })     => p.id),
    ]),
  ]

  type PetRow = { id: string; name: string; species: string; breed: string | null; clinic_id: string | null }
  let pets: PetRow[] = []
  if (allPetIds.length > 0) {
    const { data } = await admin.from('pets')
      .select('id, name, species, breed, clinic_id')
      .in('id', allPetIds)
      .eq('is_active', true)
      .order('name')
    pets = (data ?? []) as PetRow[]
  }

  // Fetch clinics for all pets that have one
  const clinicIds = [...new Set(pets.map(p => p.clinic_id).filter(Boolean) as string[])]
  type ClinicRow = { id: string; name: string; public_profile: ClinicPublicProfile | null }
  const clinicMap: Record<string, { id: string; name: string; allows_virtual: boolean }> = {}
  if (clinicIds.length > 0) {
    const { data: clinicRows } = await admin.from('clinics')
      .select('id, name, public_profile')
      .in('id', clinicIds)
    for (const c of (clinicRows ?? []) as ClinicRow[]) {
      clinicMap[c.id] = {
        id:             c.id,
        name:           c.name,
        allows_virtual: c.public_profile?.allows_virtual !== false,
      }
    }
  }

  return (
    <div style={{
      padding: 'max(20px, env(safe-area-inset-top)) 16px 100px',
      maxWidth: 560,
      margin: '0 auto',
    }}>
      <BookingWizard pets={pets} clinics={clinicMap} />
    </div>
  )
}
