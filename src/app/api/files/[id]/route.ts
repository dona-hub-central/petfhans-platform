import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — signed URL
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: file } = await admin.from('pet_files').select('file_path, file_name').eq('id', id).single()
  if (!file) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const { data } = await admin.storage.from('pet-files').createSignedUrl(file.file_path, 3600)
  return NextResponse.json({ url: data?.signedUrl })
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: file } = await admin.from('pet_files').select('file_path').eq('id', id).single()
  if (!file) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await admin.storage.from('pet-files').remove([file.file_path])
  await admin.from('pet_files').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
