import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — signed URL
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('id, role, clinic_id').eq('user_id', user.id).single()

  const admin = createAdminClient()

  // H-5: obtener archivo con clinic_id a través de join con pets
  const { data: fileRecord } = await admin.from('pet_files')
    .select('file_path, file_name, pet_id, pets!inner(clinic_id)')
    .eq('id', id)
    .single()

  if (!fileRecord) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const fileClinicId = (fileRecord.pets as unknown as { clinic_id: string } | null)?.clinic_id

  // Verificar que el archivo pertenece a la clínica del usuario
  if (fileClinicId !== profile?.clinic_id) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  // Si es pet_owner, verificar además acceso explícito a esa mascota
  if (profile?.role === 'pet_owner') {
    const { data: access } = await admin.from('pet_access')
      .select('pet_id')
      .eq('owner_id', profile.id)
      .eq('pet_id', fileRecord.pet_id)
      .single()
    if (!access) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const { data } = await admin.storage.from('pet-files').createSignedUrl(fileRecord.file_path, 3600)
  return NextResponse.json({ url: data?.signedUrl })
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('id, role, clinic_id').eq('user_id', user.id).single()

  const admin = createAdminClient()

  // H-5: obtener archivo con clinic_id y verificar ownership antes de borrar
  const { data: fileRecord } = await admin.from('pet_files')
    .select('file_path, pet_id, pets!inner(clinic_id)')
    .eq('id', id)
    .single()

  if (!fileRecord) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const fileClinicId = (fileRecord.pets as unknown as { clinic_id: string } | null)?.clinic_id

  if (fileClinicId !== profile?.clinic_id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  // Pet owners no pueden borrar archivos (solo staff de clínica)
  if (profile?.role === 'pet_owner') {
    return NextResponse.json({ error: 'Sin permisos para eliminar archivos' }, { status: 403 })
  }

  await admin.storage.from('pet-files').remove([fileRecord.file_path])
  await admin.from('pet_files').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
