import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pet_id, appointment_date, appointment_time, reason, is_virtual = false } = await req.json()
  if (!pet_id || !appointment_date || !appointment_time || !reason)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('id, clinic_id, full_name, email').eq('user_id', user.id).single()
  const { data: pet } = await admin.from('pets').select('name, clinic_id, clinics(name, slug)').eq('id', pet_id).single()

  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  // Verificar que el slot no esté ocupado
  const { data: existing } = await admin.from('appointments')
    .select('id').eq('clinic_id', pet.clinic_id)
    .eq('appointment_date', appointment_date)
    .eq('appointment_time', appointment_time)
    .in('status', ['pending', 'confirmed'])
    .single()

  if (existing) return NextResponse.json({ error: 'Ese horario ya está reservado' }, { status: 409 })

  const { data: appt, error } = await admin.from('appointments').insert({
    clinic_id:        pet.clinic_id,
    pet_id,
    owner_id:         profile!.id,
    appointment_date,
    appointment_time,
    reason,
    is_virtual:       Boolean(is_virtual),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Email al dueño — confirmación de solicitud
  const clinicName = (pet as any).clinics?.name ?? 'la clínica'
  const slug = (pet as any).clinics?.slug
  const virtualNote = is_virtual
    ? `<div style="background:#f0f4ff;border-radius:10px;padding:14px 16px;margin:12px 0;border-left:3px solid #6366f1">
        <p style="margin:0;font-size:14px;color:#4338ca"><strong>📹 Cita por videollamada</strong></p>
        <p style="margin:6px 0 0;font-size:13px;color:#4338ca">Recibirás el enlace de Jitsi Meet en el email de confirmación cuando la clínica apruebe tu solicitud.</p>
      </div>`
    : ''
  await resend.emails.send({
    from: 'Petfhans <noreply@petfhans.com>',
    to: profile!.email,
    subject: `${is_virtual ? '📹' : '📅'} Cita solicitada para ${pet.name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0">🐾 Petfhans</h2>
      </div>
      <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
        <p>Hola <strong>${profile!.full_name}</strong>,</p>
        <p>Tu solicitud de cita para <strong>${pet.name}</strong> ha sido enviada a <strong>${clinicName}</strong>.</p>
        <div style="background:#f9f9f9;border-radius:10px;padding:16px;margin:16px 0">
          <p style="margin:0 0 6px"><strong>📅 Fecha:</strong> ${new Date(appointment_date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          <p style="margin:0 0 6px"><strong>🕐 Hora:</strong> ${appointment_time.slice(0,5)}</p>
          <p style="margin:0 0 6px"><strong>📋 Motivo:</strong> ${reason}</p>
          <p style="margin:0"><strong>Modalidad:</strong> ${is_virtual ? '📹 Videollamada' : '🏥 Presencial'}</p>
        </div>
        ${virtualNote}
        <p>Te notificaremos cuando la clínica confirme o gestione tu cita.</p>
        <a href="https://${slug}.petfhans.com/owner/dashboard" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          Ver mis citas
        </a>
      </div>
    </div>`,
  }).catch(() => {})

  return NextResponse.json({ appointment: appt })
}
