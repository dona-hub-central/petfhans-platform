import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUS = ['pending', 'reviewing', 'approved', 'rejected'] as const

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 })
  }

  const body = await req.json()
  const status = body.status as string | undefined
  const admin_notes = body.admin_notes !== undefined ? String(body.admin_notes) : undefined

  if (status && !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const update: Record<string, unknown> = { reviewed_at: new Date().toISOString(), reviewed_by: user.id }
  if (status !== undefined) update.status = status
  if (admin_notes !== undefined) update.admin_notes = admin_notes

  const { error } = await admin.from('support_requests')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[support PATCH] error:', error.message)
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
