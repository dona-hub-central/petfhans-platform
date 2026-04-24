import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const { data: careRequest } = await admin
    .from('care_requests')
    .select('id, clinic_id, requester_id, status')
    .eq('id', id)
    .single()

  if (!careRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (careRequest.clinic_id !== profile.clinic_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (careRequest.status !== 'pending') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })
  }

  const body = await req.json() as { action?: string; reason?: string }
  const { action, reason } = body

  if (action === 'accept') {
    // Deferred to Fase D — requires profile_clinics.insert()
    return NextResponse.json(
      { error: 'La vinculación automática estará disponible en la próxima versión' },
      { status: 501 }
    )
  }

  if (action === 'reject') {
    const retryAfter = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { error } = await admin
      .from('care_requests')
      .update({
        status: 'rejected',
        rejection_note: reason?.trim() || null,
        responded_at: new Date().toISOString(),
        retry_after: retryAfter,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Error al rechazar solicitud' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'block') {
    const { error: updateErr } = await admin
      .from('care_requests')
      .update({
        status: 'blocked',
        rejection_note: reason?.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: 'Error al bloquear' }, { status: 500 })

    // Insert clinic block (upsert to avoid duplicate error)
    await admin.from('clinic_blocks').upsert(
      { clinic_id: careRequest.clinic_id, owner_id: careRequest.requester_id },
      { onConflict: 'clinic_id,owner_id', ignoreDuplicates: true }
    )

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no válida. Usa: accept, reject o block' }, { status: 400 })
}
