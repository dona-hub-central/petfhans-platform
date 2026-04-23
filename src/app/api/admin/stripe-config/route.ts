import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { secretKey, publicKey } = await req.json()

  try {
    const envPath = path.join(process.cwd(), '.env.local')
    let content = fs.readFileSync(envPath, 'utf8')

    if (secretKey) {
      content = content.replace(/^STRIPE_SECRET_KEY=.*$/m, `STRIPE_SECRET_KEY=${secretKey}`)
      if (!content.match(/^STRIPE_SECRET_KEY=/m)) content += `\nSTRIPE_SECRET_KEY=${secretKey}`
    }
    if (publicKey) {
      content = content.replace(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*$/m, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publicKey}`)
      if (!content.match(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=/m)) content += `\nNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publicKey}`
    }

    fs.writeFileSync(envPath, content, 'utf8')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
