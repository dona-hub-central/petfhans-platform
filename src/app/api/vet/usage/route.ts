import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const activeClinicId = request.headers.get('x-active-clinic-id')
  if (!activeClinicId) return NextResponse.json({ count: 0, max: 0 })

  const admin = createAdminClient()
  const [{ count }, { data: clinic }] = await Promise.all([
    admin.from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', activeClinicId)
      .eq('is_active', true),
    admin.from('clinics')
      .select('max_patients')
      .eq('id', activeClinicId)
      .single(),
  ])

  return NextResponse.json({
    count: count ?? 0,
    max:   (clinic as { max_patients?: number } | null)?.max_patients ?? 0,
  })
}
