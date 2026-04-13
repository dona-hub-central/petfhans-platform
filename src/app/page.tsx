import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const redirects: Record<string, string> = {
    superadmin:   '/admin',
    vet_admin:    '/vet/dashboard',
    veterinarian: '/vet/dashboard',
    pet_owner:    '/owner/dashboard',
  }

  redirect(redirects[profile?.role ?? ''] ?? '/auth/login')
}
