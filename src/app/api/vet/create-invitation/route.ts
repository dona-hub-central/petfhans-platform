import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email'
import { canInviteRole } from '@/lib/invitation-permissions'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles')
      .select('id, role').eq('user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

    // Get clinic from profile_clinics (server-side, no cookie dependency)
    const { data: clinicLink } = await supabase
      .from('profile_clinics')
      .select('clinic_id')
      .eq('user_id', user.id)
      .in('role', ['vet_admin', 'veterinarian'])
      .limit(1)
      .single()
    const activeClinicId = clinicLink?.clinic_id
    if (!activeClinicId) return NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 })

    const { email, role, pet_id, pet_ids } = await req.json()

    // H-7: validar que el invitador tiene permiso para crear este rol
    if (!canInviteRole(profile.role, role)) {
      return NextResponse.json(
        { error: `El rol '${profile.role}' no puede invitar con rol '${role}'` },
        { status: 403 }
      )
    }

    // clinic_id SIEMPRE del perfil del servidor, nunca del body
    const admin = createAdminClient()

    // Normalizar pet_ids: si viene pet_id singular, incluirlo en el array
    const resolvedPetIds: string[] = Array.isArray(pet_ids)
      ? pet_ids
      : pet_id ? [pet_id] : []

    // Crear invitación
    // pet_ids (array) se activa con migration 009; por ahora solo pet_id singular
    const { data: inv, error } = await admin.from('invitations')
      .insert({
        clinic_id:  activeClinicId,
        email,
        role,
        pet_id:     resolvedPetIds[0] || null,
        created_by: profile.id,
      })
      .select('*, pets(name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Obtener datos de la clínica
    const { data: clinic } = await admin.from('clinics')
      .select('slug, name').eq('id', activeClinicId).single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petfhans.com'
    const inviteLink = `${appUrl}/auth/invite?token=${inv.token}`

    type InvWithPet = typeof inv & { pets: { name: string } | null }
    await sendInvitationEmail({
      to:         email,
      clinicName: clinic?.name ?? 'Petfhans',
      petName:    (inv as InvWithPet).pets?.name,
      role,
      inviteLink,
      expiresAt:  inv.expires_at,
    })

    return NextResponse.json({ success: true, invitation_id: inv.id })
  } catch (err) {
    console.error('Invitation error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
