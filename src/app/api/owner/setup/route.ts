import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureProfile } from '@/lib/ensure-profile'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { clinic_slug, pet_name, pet_species } = await req.json()

  const admin = createAdminClient()

  // Backfill profile if missing — accounts created without metadata role
  // never had the auth trigger fire.
  const profile = await ensureProfile(user)
  if (!profile) return NextResponse.json({ error: 'No se pudo crear el perfil' }, { status: 500 })
  if (profile.role !== 'pet_owner') return NextResponse.json({ error: 'Solo para dueños' }, { status: 403 })

  let clinicId: string | null = null

  // Vincular a clínica por slug
  if (clinic_slug) {
    const { data: clinic } = await admin.from('clinics')
      .select('id').eq('slug', clinic_slug.trim().toLowerCase()).single()
    if (!clinic) return NextResponse.json({ error: 'No se encontró una clínica con ese código' }, { status: 404 })
    clinicId = clinic.id

    await admin.from('profile_clinics').upsert(
      { user_id: user.id, clinic_id: clinicId, role: 'pet_owner' },
      { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
    )
  }

  // Crear mascota si se proporcionó nombre y especie (clinic_id es opcional)
  if (pet_name?.trim() && pet_species) {
    const { data: newPet } = await admin.from('pets').insert({
      clinic_id: clinicId ?? null,
      owner_id:  profile.id,
      name:      pet_name.trim(),
      species:   pet_species,
    }).select('id').single()

    // Grant owner access so the pet appears in their dashboard
    if (newPet?.id) {
      await admin.from('pet_access').upsert({
        owner_id:  profile.id,
        pet_id:    newPet.id,
        clinic_id: clinicId ?? null,
        linked_by: profile.id,
      }, { onConflict: 'owner_id,pet_id' })
    }
  }

  return NextResponse.json({ success: true })
}
