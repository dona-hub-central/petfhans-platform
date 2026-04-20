import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('clinic_id').eq('user_id', user.id).single()

  if (!profile?.clinic_id) return NextResponse.json({ count: 0, max: 0 })

  const admin = createAdminClient()
  const [{ count }, { data: clinic }] = await Promise.all([
    admin.from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', profile.clinic_id)
      .eq('is_active', true),
    admin.from('clinics')
      .select('max_patients')
      .eq('id', profile.clinic_id)
      .single(),
  ])

  return NextResponse.json({
    count: count ?? 0,
    max:   (clinic as { max_patients?: number } | null)?.max_patients ?? 0,
  })
}
