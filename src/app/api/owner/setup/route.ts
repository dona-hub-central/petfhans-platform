import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { clinic_slug, pet_name, pet_species } = await req.json()

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
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

  // Crear mascota si se proporcionó nombre y especie
  if (pet_name?.trim() && pet_species && clinicId) {
    await admin.from('pets').insert({
      clinic_id: clinicId,
      owner_id:  profile.id,
      name:      pet_name.trim(),
      species:   pet_species,
    })
  }

  return NextResponse.json({ success: true })
}
