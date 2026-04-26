import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function jitsiRoom(appointmentId: string) {
  return `petfhans-${appointmentId.replace(/-/g, '').slice(0, 16)}`
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile?.clinic_id) {
    return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })
  }

  const { status, notes, cancellation_reason } = await req.json()
  const admin = createAdminClient()

  const { data: appt } = await admin.from('appointments')
    .select('*, pets(name), profiles!appointments_owner_id_fkey(full_name, email), clinics(name, slug, id)')
    .eq('id', id).single()

  if (!appt) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  type ApptRow = typeof appt & {
    profiles: { full_name: string; email: string } | null
    pets:     { name: string } | null
    clinics:  { name: string; slug: string; id: string } | null
  }
  const row = appt as ApptRow

  const appointmentClinicId = (row.clinics as { id: string } | null)?.id
  if (!appointmentClinicId || appointmentClinicId !== callerProfile.clinic_id) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const isVirtual = Boolean(appt.is_virtual)
  const room = jitsiRoom(id)
  const joinUrl = `https://meet.jit.si/${room}`

  const { error } = await admin.from('appointments').update({
    status,
    notes:               notes ?? appt.notes,
    cancellation_reason: cancellation_reason ?? appt.cancellation_reason,
    updated_at:          new Date().toISOString(),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Email al dueño según estado
  const owner  = row.profiles
  const pet    = row.pets
  const clinic = row.clinics
  const dateStr = new Date(appt.appointment_date).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
  const timeStr = appt.appointment_time.slice(0,5)

  const virtualBlock = isVirtual && status === 'confirmed'
    ? `<div style="background:#f0f4ff;border-radius:10px;padding:16px;margin:16px 0;border-left:3px solid #6366f1">
        <p style="margin:0 0 6px;font-size:14px;color:#4338ca"><strong>📹 Enlace de videollamada</strong></p>
        <p style="margin:0 0 10px;font-size:13px;color:#4338ca">Únete a la consulta virtual en el horario indicado:</p>
        <a href="${joinUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;display:inline-block">
          Unirse con Jitsi Meet
        </a>
        <p style="margin:10px 0 0;font-size:11px;color:#6366f1">Sala: ${room}</p>
      </div>`
    : ''

  const templates: Record<string, { subject: string; body: string; icon: string }> = {
    confirmed: {
      icon: isVirtual ? '📹' : '✅',
      subject: `${isVirtual ? 'Videollamada' : 'Cita'} confirmada para ${pet?.name}`,
      body: `Tu ${isVirtual ? 'consulta virtual' : 'cita'} del <strong>${dateStr} a las ${timeStr}</strong> ha sido <strong style="color:#16a34a">confirmada</strong> por ${clinic?.name}.${notes ? `<br><br><em>Nota del veterinario: ${notes}</em>` : ''}`,
    },
    cancelled: {
      icon: '❌', subject: `Cita cancelada para ${pet?.name}`,
      body: `Lamentablemente tu cita del <strong>${dateStr} a las ${timeStr}</strong> ha sido <strong style="color:#dc2626">cancelada</strong>.${cancellation_reason ? `<br><br><em>Motivo: ${cancellation_reason}</em>` : ''}`,
    },
    completed: {
      icon: '✓', subject: `Consulta completada · ${pet?.name}`,
      body: `La consulta del <strong>${dateStr} a las ${timeStr}</strong> ha sido marcada como completada. Gracias por confiar en ${clinic?.name}.`,
    },
  }

  const tpl = templates[status]
  if (tpl && owner?.email) {
    await resend.emails.send({
      from: 'Petfhans <noreply@petfhans.com>',
      to: owner.email,
      subject: `${tpl.icon} ${tpl.subject}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#EE726D;padding:20px 28px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">🐾 Petfhans</h2>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #ebebeb;border-top:none;border-radius:0 0 12px 12px">
          <p>Hola <strong>${owner.full_name}</strong>,</p>
          <p>${tpl.body}</p>
          ${virtualBlock}
          <a href="https://petfhans.com/owner/dashboard" style="background:#EE726D;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:12px">
            Ver mis citas
          </a>
        </div>
      </div>`,
    }).catch((err: unknown) => { console.error('[appointments/PATCH] email failed:', err) })
  }

  return NextResponse.json({ ok: true })
}
