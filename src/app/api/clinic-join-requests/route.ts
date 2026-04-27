import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  if (!profile.clinic_id) {
    return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })
  }

  const { data: requests, error } = await admin
    .from('clinic_join_requests')
    .select(`
      id, vet_id, message, status, created_at,
      profiles!vet_id(full_name, email, avatar_url, role)
    `)
    .eq('clinic_id', profile.clinic_id)
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
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['vet_admin', 'veterinarian'].includes(profile.role)) {
    return NextResponse.json({ error: 'Solo veterinarios pueden solicitar unirse a clínicas' }, { status: 403 })
  }

  const body = await req.json() as { clinic_id?: string; message?: string }
  const { clinic_id, message } = body
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id requerido' }, { status: 400 })

  // Can't request to join own current clinic
  if (profile.clinic_id === clinic_id) {
    return NextResponse.json({ error: 'Ya perteneces a esta clínica' }, { status: 409 })
  }

  // Verify clinic exists
  const { data: clinic } = await admin.from('clinics').select('id').eq('id', clinic_id).single()
  if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  // Check for existing pending request
  const { data: existing } = await admin
    .from('clinic_join_requests')
    .select('id, status')
    .eq('vet_id', profile.id)
    .eq('clinic_id', clinic_id)
    .maybeSingle()

  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'Ya tienes una solicitud pendiente para esta clínica' }, { status: 409 })
  }
  if (existing?.status === 'accepted') {
    return NextResponse.json({ error: 'Ya eres miembro de esta clínica' }, { status: 409 })
  }

  // Upsert: overwrite previous rejection with new request
  const { data: newRequest, error } = await admin
    .from('clinic_join_requests')
    .upsert(
      {
        vet_id: profile.id,
        clinic_id,
        message: message?.trim() || null,
        status: 'pending',
        responded_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'vet_id,clinic_id' }
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Error al enviar solicitud' }, { status: 500 })

  return NextResponse.json({ data: newRequest }, { status: 201 })
}
