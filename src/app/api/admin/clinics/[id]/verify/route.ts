import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  if (profile.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede verificar clínicas' }, { status: 403 })
  }

  const { id } = await params
  const { verified } = await req.json()
  if (typeof verified !== 'boolean') {
    return NextResponse.json({ error: 'verified debe ser boolean' }, { status: 422 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('clinics').update({ verified }).eq('id', id)

  if (error) {
    console.error('[admin/clinics/verify]', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, verified })
}
