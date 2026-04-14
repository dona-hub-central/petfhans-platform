import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('id, role, clinic_id').eq('user_id', user.id).single()

  const formData = await req.formData()
  const file      = formData.get('file') as File
  const petId     = formData.get('pet_id') as string
  const fileType  = (formData.get('file_type') as string) || 'other'
  const notes     = (formData.get('notes') as string) || ''

  if (!file || !petId) return NextResponse.json({ error: 'Faltan datos: file=' + !!file + ' petId=' + !!petId }, { status: 400 })
  console.log('[upload] file:', file.name, file.size, file.type, '| pet:', petId, '| role:', profile?.role)

  const admin = createAdminClient()

  // Para dueños: obtener clinic_id de la mascota
  let clinicId = profile?.clinic_id
  if (profile?.role === 'pet_owner') {
    const { data: pet } = await admin.from('pets').select('clinic_id').eq('id', petId).single()
    clinicId = pet?.clinic_id
  }

  // Subir a Supabase Storage
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `${clinicId}/${petId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('pet-files')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) { console.error('[upload] storage error:', uploadErr); return NextResponse.json({ error: 'Storage: ' + uploadErr.message }, { status: 400 }) }

  // Guardar en BD
  const { data: fileRecord, error: dbErr } = await admin.from('pet_files').insert({
    pet_id:      petId,
    clinic_id:   clinicId,
    uploaded_by: profile!.id,
    file_type:   fileType,
    file_name:   file.name,
    file_path:   uploadData.path,
    file_size:   file.size,
    mime_type:   file.type,
    notes,
  }).select().single()

  if (dbErr) {
    console.error('[upload] DB error:', dbErr)
    await admin.storage.from('pet-files').remove([uploadData.path])
    return NextResponse.json({ error: 'DB: ' + dbErr.message }, { status: 400 })
  }

  return NextResponse.json({ file: fileRecord })
}
