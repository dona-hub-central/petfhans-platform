import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ensureProfile } from '@/lib/ensure-profile'
import GreetingHeader from '@/components/owner/dashboard/GreetingHeader'
import DashboardWidgets from '@/components/owner/dashboard/DashboardWidgets'
import type { DashboardPet } from '@/components/owner/dashboard/PetSummaryWidget'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi perfil · Petfhans' }

export default async function OwnerPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const ensured = await ensureProfile(user)
  if (!ensured) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()
  if (!profile) redirect('/auth/login')

  const [{ data: access }, { data: ownedPets }] = await Promise.all([
    admin.from('pet_access').select('pet_id').eq('owner_id', profile.id),
    admin.from('pets').select('id').eq('owner_id', profile.id).eq('is_active', true),
  ])

  const petIds = new Set<string>()
  ;(access ?? []).forEach(a => petIds.add(a.pet_id))
  ;(ownedPets ?? []).forEach(p => petIds.add(p.id))

  // Backfill missing pet_access entries so future loads use the fast path
  const accessSet = new Set((access ?? []).map(a => a.pet_id))
  const missing = (ownedPets ?? []).map(p => p.id).filter(id => !accessSet.has(id))
  if (missing.length > 0) {
    await admin.from('pet_access').upsert(
      missing.map(pet_id => ({
        owner_id:  profile.id,
        pet_id,
        clinic_id: null,
        linked_by: profile.id,
      })),
      { onConflict: 'owner_id,pet_id', ignoreDuplicates: true }
    )
  }

  let pets: DashboardPet[] = []
  if (petIds.size > 0) {
    const { data } = await admin
      .from('pets')
      .select('id, name, species, breed, birth_date, weight, photo_url, gender, neutered')
      .in('id', [...petIds])
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    pets = (data ?? []) as DashboardPet[]
  }

  let appointmentCount = 0
  if (pets.length > 0) {
    const { count } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('pet_id', pets.map(p => p.id))
      .in('status', ['pending', 'confirmed'])
    appointmentCount = count ?? 0
  }

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

  return (
    <div className="pf-perfil">
      <div className="pf-perfil-inner">
        <GreetingHeader name={profile.full_name ?? ''} />
        <DashboardWidgets
          pets={pets}
          appointmentCount={appointmentCount}
          unreadMessages={unreadMessages}
        />
      </div>

      <style>{`
        .pf-perfil {
          min-height: 100svh;
          background: var(--pf-bg);
        }
        .pf-perfil-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: max(20px, env(safe-area-inset-top)) 16px 32px;
          display: flex; flex-direction: column; gap: 18px;
        }
        @media (min-width: 768px) {
          .pf-perfil-inner { padding: 32px 28px 48px; gap: 22px; }
        }
      `}</style>
    </div>
  )
}
