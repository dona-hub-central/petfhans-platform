import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const activeClinicId = req.headers.get('x-active-clinic-id')
  if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const { data: joinRequest } = await admin
    .from('clinic_join_requests')
    .select('id, vet_id, clinic_id, status')
    .eq('id', id)
    .eq('clinic_id', activeClinicId)  // ownership: solo puede gestionar solicitudes de su clínica
    .single()

  if (!joinRequest) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (joinRequest.status !== 'pending') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 409 })
  }

  const body = await req.json() as { action?: string }
  const { action } = body

  if (action === 'accept') {
    // Resolve the vet's auth user_id and current role
    const { data: vet } = await admin
      .from('profiles')
      .select('user_id, full_name, email, role')
      .eq('id', joinRequest.vet_id)
      .single()

    if (!vet) return NextResponse.json({ error: 'Veterinario no encontrado' }, { status: 404 })

    // Link vet to clinic in profile_clinics (multi-clinic pivot)
    const { error: linkError } = await admin
      .from('profile_clinics')
      .upsert(
        { user_id: vet.user_id, clinic_id: joinRequest.clinic_id, role: vet.role ?? 'veterinarian' },
        { onConflict: 'user_id,clinic_id', ignoreDuplicates: true }
      )

    if (linkError) return NextResponse.json({ error: 'Error al vincular veterinario' }, { status: 500 })

    const { error: updErr } = await admin
      .from('clinic_join_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', id)

    if (updErr) return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 })

    // Notify the vet by email
    const { data: clinic } = await admin
      .from('clinics').select('name').eq('id', joinRequest.clinic_id).single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM   = process.env.EMAIL_FROM ?? 'Petfhans <noreply@petfhans.com>'

    await resend.emails.send({
      from: FROM,
      to:   vet.email,
      subject: `¡Bienvenido/a a ${clinic?.name ?? 'la clínica'}! Tu solicitud fue aceptada`,
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">🐾 Petfhans</h2>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
          <p>Hola <strong>${vet.full_name}</strong>,</p>
          <p><strong>${clinic?.name ?? 'La clínica'}</strong> ha aceptado tu solicitud para unirte al equipo. Ya puedes acceder al panel.</p>
          <a href="${appUrl}/vet/dashboard" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
            Ir al panel
          </a>
        </div>
      </div>`,
    }).catch((err: unknown) => { console.error('[join-request/accept] email:', err) })

    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('clinic_join_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Error al rechazar solicitud' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no válida. Usa: accept o reject' }, { status: 400 })
}
