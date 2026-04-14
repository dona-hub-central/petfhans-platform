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

  const formData = await req.formData()
  const file  = formData.get('file') as File
  const petId = formData.get('pet_id') as string

  if (!file || !petId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 })

  const admin = createAdminClient()

  // Borrar foto anterior si existe
  const { data: pet } = await admin.from('pets').select('photo_url').eq('id', petId).single()
  if (pet?.photo_url) {
    // Extraer path del storage desde la URL firmada no es directo — usar lista de archivos
    try {
      const { data: files } = await admin.storage.from('pet-files').list(`photos/${petId}`)
      if (files?.length) await admin.storage.from('pet-files').remove(files.map(f => `photos/${petId}/${f.name}`))
    } catch (_) {}
  }

  // Subir nueva foto
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `photos/${petId}/profile.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('pet-files')
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

  // URL pública permanente (bucket público)
  const { data: urlData } = admin.storage
    .from('pet-files')
    .getPublicUrl(uploadData.path)

  const photo_url = urlData.publicUrl

  // Guardar en BD
  await admin.from('pets').update({ photo_url }).eq('id', petId)

  return NextResponse.json({ ok: true, photo_url })
}
