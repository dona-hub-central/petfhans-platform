import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pet_id, vet_id } = await req.json()
  if (!pet_id || !vet_id) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()

  const activeClinicId = request.headers.get('x-active-clinic-id')
  if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  const [{ data: profile }, { data: pet }, { data: vet }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('user_id', user.id).single(),
    admin.from('pets').select('name, species, clinic_id, clinics(name, slug)').eq('id', pet_id).single(),
    admin.from('profiles').select('id, clinic_id, full_name, role').eq('id', vet_id).single(),
  ])

  if (!pet)  return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (!vet)  return NextResponse.json({ error: 'Veterinario no encontrado' }, { status: 404 })

  // Security: vet must belong to the same clinic as the pet
  if (vet.clinic_id !== pet.clinic_id) {
    return NextResponse.json({ error: 'El veterinario no pertenece a esta clínica' }, { status: 403 })
  }

  // Active clinic must match the pet's clinic
  if (pet.clinic_id !== activeClinicId) {
    return NextResponse.json({ error: 'No autorizado para esta clínica' }, { status: 403 })
  }

  const now  = new Date()
  const date = now.toISOString().split('T')[0]
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

  const { data: appt, error } = await admin.from('appointments').insert({
    clinic_id:        pet.clinic_id,
    pet_id,
    owner_id:         profile!.id,
    vet_id:           vet.id,
    appointment_date: date,
    appointment_time: time,
    reason:           `[EMERGENCIA] Consulta virtual inmediata — ${pet.name}`,
    status:           'confirmed',   // immediately confirmed, no approval needed
    is_virtual:       true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ appointment: appt })
}
