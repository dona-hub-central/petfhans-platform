import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

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
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: clinicLink } = await admin
    .from('profile_clinics')
    .select('clinic_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!clinicLink?.clinic_id) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  const activeClinicId = clinicLink.clinic_id

  const { id } = await params
  const { data: careRequest } = await admin
    .from('care_requests')
    .select('id, clinic_id, requester_id, status')
    .eq('id', id)
    .single()

  if (!careRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (careRequest.clinic_id !== activeClinicId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (careRequest.status !== 'pending') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })
  }

  const body = await req.json() as { action?: string; reason?: string }
  const { action, reason } = body

  if (action === 'accept') {
    // Resolve the requester's auth user_id (profile_clinics references auth.users)
    const { data: requester } = await admin
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('id', careRequest.requester_id)
      .single()

    if (!requester) return NextResponse.json({ error: 'Solicitante no encontrado' }, { status: 404 })

    // Link owner to clinic — upsert handles already-linked gracefully
    const { error: linkError } = await admin
      .from('profile_clinics')
      .upsert(
        { user_id: requester.user_id, clinic_id: careRequest.clinic_id, role: 'pet_owner' },
        { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
      )

    if (linkError) return NextResponse.json({ error: 'Error al vincular dueño' }, { status: 500 })

    // Update care request
    const { error: updErr } = await admin
      .from('care_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', id)

    if (updErr) return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 })

    // Notify owner by email
    const { data: clinic } = await admin
      .from('clinics').select('name').eq('id', careRequest.clinic_id).single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM   = process.env.EMAIL_FROM ?? 'Petfhans <noreply@petfhans.com>'

    await resend.emails.send({
      from: FROM,
      to:   requester.email,
      subject: `¡Solicitud aceptada! Ya puedes acceder a ${clinic?.name ?? 'la clínica'}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">🐾 Petfhans</h2>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
          <p>Hola <strong>${requester.full_name}</strong>,</p>
          <p><strong>${clinic?.name ?? 'La clínica'}</strong> ha aceptado tu solicitud de atención. Ya tienes acceso a la plataforma.</p>
          <a href="${appUrl}/owner/dashboard" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
            Ver mi cuenta
          </a>
        </div>
      </div>`,
    }).catch((err: unknown) => { console.error('[care-request/accept] email:', err) })

    return NextResponse.json({ success: true })
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
