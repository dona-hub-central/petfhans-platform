import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import OwnerPetView from '@/components/owner/OwnerPetView'
import type { Pet, PetFile, PetFileWithUrl, RecordWithVet, AppointmentSummary } from '@/types'

export default async function OwnerPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name, slug)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const { data: pet } = await admin.from('pets').select('*').eq('id', id).single()
  if (!pet) redirect('/owner/dashboard')

  const { data: records } = await admin.from('medical_records')
    .select('*, profiles!medical_records_vet_id_fkey(full_name)')
    .eq('pet_id', id).order('visit_date', { ascending: false })

  const { data: petFiles } = await admin.from('pet_files')
    .select('id, file_name, file_type, file_size, mime_type, notes, created_at, file_path')
    .eq('pet_id', id).order('created_at', { ascending: false })

  // Citas de la mascota (próximas y recientes)
  const { data: appointments } = await admin.from('appointments')
    .select('id, appointment_date, appointment_time, reason, status, is_virtual, notes, cancellation_reason')
    .eq('pet_id', id)
    .order('appointment_date', { ascending: false })
    .limit(20)

  // Separar fotos de docs
  const photoFiles = (petFiles ?? []).filter(f => f.file_type === 'photo' || f.mime_type?.startsWith('image/'))
  const docFiles   = (petFiles ?? []).filter(f => f.file_type !== 'photo' && !f.mime_type?.startsWith('image/'))

  // Generar URLs públicas para fotos
  const photosWithUrls = await Promise.all(photoFiles.map(async (f) => {
    const { data } = await admin.storage.from('pet-files').createSignedUrl(f.file_path || '', 3600 * 24)
    return { ...f, publicUrl: data?.signedUrl || '' }
  }))

  type ProfileRow = { clinics: { name: string; slug: string } | null }
  const clinicName = (profile as ProfileRow | null)?.clinics?.name ?? ''

  return (
    <OwnerPetView
      pet={pet as Pet}
      records={(records ?? []) as RecordWithVet[]}
      photos={photosWithUrls as PetFileWithUrl[]}
      docs={docFiles as PetFile[]}
      appointments={(appointments ?? []) as AppointmentSummary[]}
      clinicName={clinicName}
      clinicId={pet.clinic_id}
    />
  )
}
