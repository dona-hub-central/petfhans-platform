import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slug } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data: clinic, error } = await admin
    .from('clinics')
    .select('id, name, slug, verified, public_profile')
    .eq('slug', slug)
    .single()
  if (error || !clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

  // Check if user is blocked by this clinic
  let isBlocked = false
  if (profile.role === 'pet_owner') {
    const { data: block } = await admin
      .from('clinic_blocks')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('owner_id', profile.id)
      .maybeSingle()
    isBlocked = !!block
  }

  // Get public-facing vet team (all vets belonging to this clinic)
  const { data: team } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('clinic_id', clinic.id)
    .in('role', ['vet_admin', 'veterinarian'])
    .order('full_name')

  // Get clinic ratings via appointments
  const { data: appointments } = await admin
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('status', 'completed')

  const apptIds = (appointments ?? []).map(a => a.id)
  let ratings: Array<{ rating: number; comment: string | null; created_at: string }> = []
  if (apptIds.length > 0) {
    const { data: ratingRows } = await admin
      .from('appointment_ratings')
      .select('rating, comment, created_at')
      .in('appointment_id', apptIds)
      .eq('rated_by', 'owner')
      .order('created_at', { ascending: false })
      .limit(20)
    ratings = ratingRows ?? []
  }

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null

  return NextResponse.json({
    data: {
      ...clinic,
      isBlocked,
      team: team ?? [],
      ratings,
      avgRating,
      ratingCount: ratings.length,
    }
  })
}
