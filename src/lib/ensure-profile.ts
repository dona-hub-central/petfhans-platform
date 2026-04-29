import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

/**
 * Ensures a profile row exists for the given auth user, creating it if missing.
 * Returns the profile row. Use this on any entry point where we cannot assume
 * the auth trigger fired (e.g. accounts created directly in Supabase admin
 * without `role` in user metadata).
 */
export async function ensureProfile(user: User) {
  const admin = createAdminClient()

  const { data: existing } = await admin.from('profiles')
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return existing

  const role     = (user.user_metadata?.role as string) || 'pet_owner'
  const fullName = (user.user_metadata?.full_name as string)
    || (user.email ? user.email.split('@')[0] : 'Usuario')

  const { data: created } = await admin.from('profiles')
    .insert({
      user_id:   user.id,
      role,
      full_name: fullName,
      email:     user.email ?? '',
    })
    .select('id, role, full_name')
    .single()

  return created
}
