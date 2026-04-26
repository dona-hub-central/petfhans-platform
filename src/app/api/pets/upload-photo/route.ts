import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('id, role, clinic_id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const formData = await req.formData()
  const file  = formData.get('file') as File
  const petId = formData.get('pet_id') as string

  if (!file || !petId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 })

  const admin = createAdminClient()

  // H-9: para pet_owner verificar acceso explícito antes de cualquier operación
  if (profile.role === 'pet_owner') {
    const { data: access } = await admin.from('pet_access')
      .select('pet_id')
      .eq('owner_id', profile.id)
      .eq('pet_id', petId)
      .single()
    if (!access) return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })
  }

  // A3: para vets verificar que la mascota pertenece a su clínica
  if (['vet_admin', 'veterinarian'].includes(profile.role)) {
    if (!profile.clinic_id) {
      return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })
    }
    const { data: vetPet } = await admin.from('pets')
      .select('clinic_id')
      .eq('id', petId)
      .single()
    if (!vetPet || vetPet.clinic_id !== profile.clinic_id) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
    }
  }

  // Borrar foto anterior si existe
  const { data: pet } = await admin.from('pets').select('photo_url').eq('id', petId).single()
  if (pet?.photo_url) {
    try {
      const { data: files } = await admin.storage.from('pet-files').list(`photos/${petId}`)
      if (files?.length) await admin.storage.from('pet-files').remove(files.map(f => `photos/${petId}/${f.name}`))
    } catch {}
  }

  // Subir nueva foto
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `photos/${petId}/profile.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('pet-files')
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  const { data: urlData } = admin.storage
    .from('pet-files')
    .getPublicUrl(uploadData.path)

  const photo_url = urlData.publicUrl

  await admin.from('pets').update({ photo_url }).eq('id', petId)

  return NextResponse.json({ ok: true, photo_url })
}
