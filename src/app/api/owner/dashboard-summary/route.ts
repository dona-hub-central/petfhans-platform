import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  if (profile.role !== 'pet_owner') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Pets via pet_access (preferred) + owner_id fallback (covers legacy/orphan cases)
  const [{ data: access }, { data: ownedPets }] = await Promise.all([
    admin.from('pet_access').select('pet_id').eq('owner_id', profile.id),
    admin.from('pets').select('id').eq('owner_id', profile.id).eq('is_active', true),
  ])

  const petIds = new Set<string>()
  ;(access ?? []).forEach(a => petIds.add(a.pet_id))
  ;(ownedPets ?? []).forEach(p => petIds.add(p.id))

  let pets: Array<{
    id: string; name: string; species: string; breed: string | null
    birth_date: string | null; weight: number | null; photo_url: string | null
    gender: string | null; neutered: boolean | null
  }> = []
  if (petIds.size > 0) {
    const { data } = await admin
      .from('pets')
      .select('id, name, species, breed, birth_date, weight, photo_url, gender, neutered')
      .in('id', [...petIds])
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    pets = data ?? []
  }

  // Active appointments (pending + confirmed)
  let appointmentCount = 0
  if (pets.length > 0) {
    const { count } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('pet_id', pets.map(p => p.id))
      .in('status', ['pending', 'confirmed'])
    appointmentCount = count ?? 0
  }

  // Unread messages from clinic in open conversations
  const { data: conversations } = await admin
    .from('conversations')
    .select('id')
    .eq('owner_id', profile.id)
    .eq('status', 'open')

  let unreadMessages = 0
  const conversationIds = (conversations ?? []).map(c => c.id)
  if (conversationIds.length > 0) {
    const { count } = await admin
      .from('conversation_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('read_by_recipient', false)
      .neq('sender_role', 'pet_owner')
    unreadMessages = count ?? 0
  }

  return NextResponse.json({
    profile: {
      id:         profile.id,
      full_name:  profile.full_name,
      email:      profile.email,
      avatar_url: profile.avatar_url,
    },
    pets,
    appointmentCount,
    unreadMessages,
  })
}
