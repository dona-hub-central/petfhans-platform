import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { invitation_id } = await req.json()
    const admin = createAdminClient()

    // Extender expiración 7 días más
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 7)

    const { data: inv, error } = await admin.from('invitations')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', invitation_id)
      .select('email, token, role')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // TODO: enviar email real cuando se configure SMTP
    // Por ahora solo extiende la expiración
    console.log(`Invitación reenviada a ${inv.email} — token: ${inv.token}`)

    return NextResponse.json({ success: true, message: `Invitación extendida para ${inv.email}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
