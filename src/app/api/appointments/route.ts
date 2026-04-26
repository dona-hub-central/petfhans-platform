import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const URGENCY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  normal:     { label: 'Normal',     color: '#16a34a', emoji: '🟢' },
  urgente:    { label: 'Urgente',    color: '#b07800', emoji: '🟡' },
  emergencia: { label: 'Emergencia', color: '#dc2626', emoji: '🔴' },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pet_id, appointment_date, appointment_time, reason, urgency = 'normal', is_virtual = false } = await req.json()
  if (!pet_id || !appointment_date || !appointment_time || !reason)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const activeClinicId = req.headers.get('x-active-clinic-id')
  if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

  // C-2: verificar que el pet pertenece a la clínica activa
  const { data: pet } = await admin.from('pets').select('name, species, clinic_id, clinics(name, slug)').eq('id', pet_id).single()

  if (!pet || pet.clinic_id !== activeClinicId)
    return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 403 })

  // Pet owners must have explicit pet_access to book appointments for this pet
  if (profile.role === 'pet_owner') {
    const { data: petAccess } = await admin.from('pet_access')
      .select('pet_id').eq('owner_id', profile.id).eq('pet_id', pet_id).maybeSingle()
    if (!petAccess) return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })
  }

  // Verificar que el slot no esté ocupado
  const { data: existing } = await admin.from('appointments')
    .select('id').eq('clinic_id', pet.clinic_id)
    .eq('appointment_date', appointment_date)
    .eq('appointment_time', appointment_time)
    .in('status', ['pending', 'confirmed'])
    .limit(1)

  if (existing && existing.length > 0)
    return NextResponse.json({ error: 'Ese horario ya está reservado' }, { status: 409 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'
  const { id: profileId, email: profileEmail, full_name: profileFullName } = profile

  const { data: appt, error } = await admin.from('appointments').insert({
    clinic_id:        pet.clinic_id,
    pet_id,
    owner_id:         profileId,
    appointment_date,
    appointment_time,
    reason,
    is_virtual:       Boolean(is_virtual),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  type PetRow = typeof pet & { clinics?: { name: string; slug: string } | null }
  const clinicName = (pet as PetRow).clinics?.name ?? 'la clínica'
  const slug = (pet as PetRow).clinics?.slug
  const urg = URGENCY_LABELS[urgency] ?? URGENCY_LABELS.normal
  const dateFormatted = new Date(appointment_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeFormatted = appointment_time.slice(0, 5)

  const urgencyBlock = `<div style="background:${urg.color}15;border-left:3px solid ${urg.color};border-radius:6px;padding:10px 14px;margin:10px 0">
    <p style="margin:0;font-size:13px;color:${urg.color};font-weight:700">${urg.emoji} Urgencia: ${urg.label}</p>
  </div>`

  const virtualNote = is_virtual
    ? `<div style="background:#f0f4ff;border-radius:10px;padding:14px 16px;margin:12px 0;border-left:3px solid #6366f1">
        <p style="margin:0;font-size:14px;color:#4338ca"><strong>📹 Cita por videollamada</strong></p>
        <p style="margin:6px 0 0;font-size:13px;color:#4338ca">El enlace de Jitsi Meet se enviará al confirmar la solicitud.</p>
      </div>`
    : ''

  // ── Email al dueño ──
  await resend.emails.send({
    from: 'Petfhans <noreply@petfhans.com>',
    to: profileEmail,
    subject: `${urg.emoji} Cita solicitada para ${pet.name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0">🐾 Petfhans</h2>
      </div>
      <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
        <p>Hola <strong>${profileFullName}</strong>,</p>
        <p>Tu solicitud de cita para <strong>${pet.name}</strong> ha sido enviada a <strong>${clinicName}</strong>. Te avisaremos cuando la clínica la confirme.</p>
        <div style="background:#f9f9f9;border-radius:10px;padding:16px;margin:16px 0">
          <p style="margin:0 0 6px"><strong>📅 Fecha:</strong> ${dateFormatted}</p>
          <p style="margin:0 0 6px"><strong>🕐 Hora:</strong> ${timeFormatted}</p>
          <p style="margin:0 0 6px"><strong>📋 Motivo:</strong> ${reason}</p>
          <p style="margin:0"><strong>Modalidad:</strong> ${is_virtual ? '📹 Videollamada' : '🏥 Presencial'}</p>
        </div>
        ${urgencyBlock}
        ${virtualNote}
        <a href="${appUrl}/owner/dashboard" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
          Ver mis citas
        </a>
      </div>
    </div>`,
  }).catch(() => {})

  // ── Email a los veterinarios de la clínica ──
  const { data: clinicVets } = await admin.from('profiles')
    .select('full_name, email')
    .eq('clinic_id', pet.clinic_id)
    .in('role', ['vet_admin', 'veterinarian'])
    .limit(10)

  if (clinicVets && clinicVets.length > 0) {
    const vetEmails = clinicVets.map(v => v.email).filter(Boolean) as string[]
    await resend.emails.send({
      from: 'Petfhans <noreply@petfhans.com>',
      to: vetEmails[0],
      cc: vetEmails.length > 1 ? vetEmails.slice(1) : undefined,
      subject: `${urg.emoji} Nueva solicitud de cita — ${pet.name} (${urg.label})`,
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">🐾 Petfhans — Nueva cita pendiente</h2>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
          <p>Hola equipo de <strong>${clinicName}</strong>,</p>
          <p>El dueño de <strong>${pet.name}</strong> ha solicitado una cita que requiere confirmación.</p>
          ${urgencyBlock}
          <div style="background:#f9f9f9;border-radius:10px;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px"><strong>🐾 Mascota:</strong> ${pet.name}</p>
            <p style="margin:0 0 6px"><strong>👤 Propietario:</strong> ${profileFullName}</p>
            <p style="margin:0 0 6px"><strong>📅 Fecha:</strong> ${dateFormatted}</p>
            <p style="margin:0 0 6px"><strong>🕐 Hora:</strong> ${timeFormatted}</p>
            <p style="margin:0 0 6px"><strong>Modalidad:</strong> ${is_virtual ? '📹 Videollamada' : '🏥 Presencial'}</p>
            <p style="margin:0"><strong>📋 Motivo / Síntomas:</strong><br>${reason}</p>
          </div>
          <a href="${appUrl}/vet/appointments" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
            Gestionar citas
          </a>
        </div>
      </div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ appointment: appt })
}
