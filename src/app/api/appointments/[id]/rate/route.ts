import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rating, comment, is_anonymous, rated_by } = await req.json()

  if (!rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'Calificación inválida (1–5)' }, { status: 400 })
  if (!rated_by || !['owner', 'vet'].includes(rated_by))
    return NextResponse.json({ error: 'rated_by inválido' }, { status: 400 })

  const admin = createAdminClient()

  // Verify appointment exists and belongs to this clinic
  const { data: appt } = await admin.from('appointments')
    .select('id, status, owner_id, clinic_id')
    .eq('id', id).single()

  if (!appt) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  // Only allow rating completed or confirmed appointments
  if (!['confirmed', 'completed'].includes(appt.status))
    return NextResponse.json({ error: 'Solo se pueden calificar citas confirmadas o completadas' }, { status: 400 })

  const { error } = await admin.from('appointment_ratings').upsert({
    appointment_id: id,
    rated_by,
    rating,
    comment:      comment?.trim() || null,
    is_anonymous: Boolean(is_anonymous),
  }, { onConflict: 'appointment_id,rated_by' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: ratings } = await admin.from('appointment_ratings')
    .select('id, rated_by, rating, comment, is_anonymous, created_at')
    .eq('appointment_id', id)

  return NextResponse.json({ ratings: ratings ?? [] })
}
