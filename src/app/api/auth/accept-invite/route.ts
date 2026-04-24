import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    // C-1: solo aceptar token, password y full_name del body
    // email, role y clinic_id vienen SIEMPRE de la invitación en BD
    const { token, full_name, password } = await req.json()
    if (!token || !password || !full_name) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Validar invitación — todos los datos de identidad vienen de aquí
    const { data: inv } = await admin.from('invitations')
      .select('*, clinics(name, slug)')
      .eq('token', token)
      .single()

    if (!inv)                                  return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    if (inv.used_at)                           return NextResponse.json({ error: 'Invitación ya usada' }, { status: 409 })
    if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 })

    // Crear usuario con email/role/clinic_id DE LA BD, nunca del body
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email:         inv.email,
      password,
      email_confirm: true,
      user_metadata: { role: inv.role, full_name, clinic_id: inv.clinic_id },
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Crear perfil con datos de la invitación
    const { data: newProfile } = await admin.from('profiles').upsert({
      user_id:   authData.user.id,
      role:      inv.role,
      full_name,
      email:     inv.email,
      clinic_id: inv.clinic_id,
    }, { onConflict: 'user_id' }).select('id').single()

    // Vincular mascota legacy (pet_id singular, para invitaciones antiguas)
    if (inv.pet_id && newProfile?.id) {
      await admin.from('pets')
        .update({ owner_id: newProfile.id })
        .eq('id', inv.pet_id)
      // Also grant pet_access so the owner can see this pet in their portal
      if (inv.role === 'pet_owner') {
        await admin.from('pet_access').upsert({
          owner_id:  newProfile.id,
          pet_id:    inv.pet_id,
          clinic_id: inv.clinic_id,
          linked_by: inv.created_by ?? newProfile.id,
        }, { onConflict: 'owner_id,pet_id' })
      }
    }

    // Crear accesos explícitos en pet_access si es pet_owner con pet_ids
    if (inv.role === 'pet_owner' && Array.isArray(inv.pet_ids) && inv.pet_ids.length > 0 && newProfile?.id) {
      await admin.from('pet_access').insert(
        inv.pet_ids.map((pet_id: string) => ({
          owner_id:  newProfile.id,
          pet_id,
          clinic_id: inv.clinic_id,
          linked_by: inv.created_by,
        }))
      )
    }

    // Marcar invitación como usada
    await admin.from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', inv.id)

    // Email de bienvenida usando el email de la BD
    type InvRow = typeof inv & { clinics?: { name: string; slug: string } | null }
    const invRow = inv as InvRow
    const slug = invRow.clinics?.slug
    await sendWelcomeEmail({
      to:         inv.email,
      name:       full_name,
      clinicName: invRow.clinics?.name ?? 'Petfhans',
      loginUrl:   `https://petfhans.com/auth/login`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
