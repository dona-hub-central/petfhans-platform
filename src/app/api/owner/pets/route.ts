import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, species } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  const validSpecies = ['dog', 'cat', 'bird', 'rabbit', 'other']
  if (!validSpecies.includes(species)) return NextResponse.json({ error: 'Especie inválida' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  if (profile.role !== 'pet_owner') return NextResponse.json({ error: 'Solo para dueños' }, { status: 403 })

  const { data: pet, error: petError } = await admin.from('pets').insert({
    clinic_id: null,
    owner_id:  profile.id,
    name:      name.trim(),
    species,
  }).select('id').single()

  if (petError) {
    console.error('[owner/pets] insert error:', petError.message)
    return NextResponse.json({ error: 'No se pudo crear la mascota' }, { status: 500 })
  }

  // Grant owner explicit access so the pet shows in their dashboard
  const { error: accessError } = await admin.from('pet_access').upsert({
    owner_id:  profile.id,
    pet_id:    pet.id,
    clinic_id: null,
    linked_by: profile.id,
  }, { onConflict: 'owner_id,pet_id', ignoreDuplicates: true })
  if (accessError) console.error('[owner/pets] pet_access upsert error:', accessError.message)

  return NextResponse.json({ success: true, pet_id: pet.id })
}
