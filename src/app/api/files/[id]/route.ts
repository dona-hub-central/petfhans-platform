import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — signed URL for viewing a file
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const { data: fileRecord } = await admin.from('pet_files')
    .select('file_path, file_name, pet_id, clinic_id')
    .eq('id', id)
    .single()
  if (!fileRecord) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  if (profile.role === 'pet_owner') {
    // Verify owner has access to this pet via pet_access or direct ownership
    const { data: access } = await admin.from('pet_access')
      .select('pet_id').eq('owner_id', profile.id).eq('pet_id', fileRecord.pet_id).maybeSingle()
    if (!access) {
      const { data: owned } = await admin.from('pets')
        .select('id').eq('id', fileRecord.pet_id).eq('owner_id', profile.id).maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }
  } else {
    // Vet staff: verify clinic access via profile_clinics (not the dead x-active-clinic-id header)
    const { data: clinicLink } = await admin.from('profile_clinics')
      .select('clinic_id').eq('user_id', user.id).limit(1).single()
    if (!clinicLink?.clinic_id) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })
    if (fileRecord.clinic_id && fileRecord.clinic_id !== clinicLink.clinic_id)
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const { data } = await admin.storage.from('pet-files').createSignedUrl(fileRecord.file_path, 3600)
  return NextResponse.json({ url: data?.signedUrl })
}

// DELETE — only clinic staff can delete files
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  if (profile.role === 'pet_owner')
    return NextResponse.json({ error: 'Sin permisos para eliminar archivos' }, { status: 403 })

  // Vet staff: resolve clinic via profile_clinics
  const { data: clinicLink } = await admin.from('profile_clinics')
    .select('clinic_id').eq('user_id', user.id).limit(1).single()
  if (!clinicLink?.clinic_id) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  const { data: fileRecord } = await admin.from('pet_files')
    .select('file_path, clinic_id').eq('id', id).single()
  if (!fileRecord) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (fileRecord.clinic_id !== clinicLink.clinic_id)
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await admin.storage.from('pet-files').remove([fileRecord.file_path])
  await admin.from('pet_files').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
