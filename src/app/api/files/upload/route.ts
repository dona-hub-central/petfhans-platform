import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file      = formData.get('file') as File
  const petId     = formData.get('pet_id') as string
  const fileType  = (formData.get('file_type') as string) || 'other'
  const notes     = (formData.get('notes') as string) || ''
  const category  = (formData.get('category') as string) || 'other'

  if (!file || !petId) return NextResponse.json({ error: 'Faltan datos: file=' + !!file + ' petId=' + !!petId }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  // Para dueños: verificar acceso y tomar clinic_id de la mascota
  // Para staff: usar profile_clinics
  let clinicId: string | null | undefined
  if (profile.role === 'pet_owner') {
    const { data: accessRow } = await admin.from('pet_access')
      .select('pet_id').eq('owner_id', profile.id).eq('pet_id', petId).maybeSingle()
    if (!accessRow) {
      const { data: owned } = await admin.from('pets')
        .select('id').eq('id', petId).eq('owner_id', profile.id).maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })
    }
    const { data: pet } = await admin.from('pets').select('clinic_id').eq('id', petId).single()
    clinicId = pet?.clinic_id ?? null
  } else {
    const { data: clinicLink } = await admin
      .from('profile_clinics').select('clinic_id').eq('user_id', user.id).limit(1).single()
    clinicId = clinicLink?.clinic_id
    if (!clinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
  }

  // Usar petId como prefijo si la mascota no tiene clínica (registro directo del owner)
  const prefix = clinicId ?? `owner-${profile.id}`
  const filePath = `${prefix}/${petId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('pet-files')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: 'Storage: ' + uploadErr.message }, { status: 400 })

  // Guardar en BD
  const { data: fileRecord, error: dbErr } = await admin.from('pet_files').insert({
    pet_id:      petId,
    clinic_id:   clinicId,
    uploaded_by: profile.id,
    file_type:   fileType,
    file_name:   file.name,
    file_path:   uploadData.path,
    file_size:   file.size,
    mime_type:   file.type,
    notes,
    category,
  }).select().single()

  if (dbErr) {
    await admin.storage.from('pet-files').remove([uploadData.path])
    return NextResponse.json({ error: 'DB: ' + dbErr.message }, { status: 400 })
  }

  return NextResponse.json({ file: fileRecord })
}
