import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/owner/dashboard'

  // Validate next is a safe relative path
  const safeDest = next.startsWith('/') && !next.startsWith('//') ? next : '/owner/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll:  () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Backfill profile row if missing — covers users created without metadata
      // role (e.g. directly via Supabase admin) so the auth trigger never fired.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const { data: existing } = await admin.from('profiles')
          .select('id').eq('user_id', user.id).maybeSingle()
        if (!existing) {
          const role = (user.user_metadata?.role as string) || 'pet_owner'
          const fullName = (user.user_metadata?.full_name as string)
            || (user.email ? user.email.split('@')[0] : 'Usuario')
          await admin.from('profiles').insert({
            user_id:   user.id,
            role,
            full_name: fullName,
            email:     user.email ?? '',
          })
        }
      }
      return NextResponse.redirect(`${origin}${safeDest}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=verification`)
}
