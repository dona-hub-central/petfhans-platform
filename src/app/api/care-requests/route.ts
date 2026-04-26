import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const activeClinicId = req.headers.get('x-active-clinic-id')
  if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: requests, error } = await admin
    .from('care_requests')
    .select(`
      id, requester_id, pet_name, pet_species, reason, preferred_vet_id,
      status, rejection_note, created_at, responded_at, retry_after,
      profiles!requester_id(full_name, email, avatar_url)
    `)
    .eq('clinic_id', activeClinicId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })

  return NextResponse.json({ data: requests ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'pet_owner') {
    return NextResponse.json({ error: 'Solo dueños de mascotas pueden enviar solicitudes' }, { status: 403 })
  }

  const body = await req.json() as {
    clinic_id?: string
    pet_name?: string
    pet_species?: string
    reason?: string
    preferred_vet_id?: string
  }

  const { clinic_id, pet_name, pet_species, reason, preferred_vet_id } = body
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id requerido' }, { status: 400 })

  // Verify clinic exists
  const { data: clinic } = await admin.from('clinics').select('id').eq('id', clinic_id).single()
  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  // Check if user is blocked by this clinic
  const { data: block } = await admin
    .from('clinic_blocks')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('owner_id', profile.id)
    .maybeSingle()
  if (block) return NextResponse.json({ error: 'No puedes solicitar atención en esta clínica' }, { status: 403 })

  // Check for existing pending request
  const { data: pending } = await admin
    .from('care_requests')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('requester_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (pending) return NextResponse.json({ error: 'Ya tienes una solicitud pendiente en esta clínica' }, { status: 409 })

  // Check retry_after on last rejection
  const { data: lastRejection } = await admin
    .from('care_requests')
    .select('retry_after')
    .eq('clinic_id', clinic_id)
    .eq('requester_id', profile.id)
    .in('status', ['rejected', 'blocked'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastRejection?.retry_after && new Date(lastRejection.retry_after) > new Date()) {
    const retryAt = new Date(lastRejection.retry_after).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return NextResponse.json(
      { error: `Puedes reintentar a partir de las ${retryAt}` },
      { status: 429 }
    )
  }

  const { data: newRequest, error } = await admin
    .from('care_requests')
    .insert({
      requester_id: profile.id,
      clinic_id,
      pet_name: pet_name?.trim() || null,
      pet_species: pet_species?.trim() || null,
      reason: reason?.trim() || null,
      preferred_vet_id: preferred_vet_id || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })

  return NextResponse.json({ data: newRequest }, { status: 201 })
}
