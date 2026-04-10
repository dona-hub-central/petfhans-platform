/**
 * Script para crear el primer superadmin
 * Uso: npx ts-node scripts/create-superadmin.ts
 *
 * O pasar variables por env:
 * ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npx ts-node scripts/create-superadmin.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@petfhans.com'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Petfhans2024!'
const NAME     = process.env.ADMIN_NAME     ?? 'Super Admin'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log(`\n🐾 Creando superadmin: ${EMAIL}`)

  // 1. Crear usuario en auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'superadmin',
      full_name: NAME,
    }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('⚠️  El email ya existe. Buscando perfil...')
    } else {
      console.error('❌ Error:', authError.message)
      process.exit(1)
    }
  }

  const userId = authData?.user?.id

  if (userId) {
    // 2. Crear perfil manualmente (por si el trigger no lo hizo)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        role: 'superadmin',
        full_name: NAME,
        email: EMAIL,
        clinic_id: null,
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('❌ Error creando perfil:', profileError.message)
      process.exit(1)
    }

    console.log('✅ Superadmin creado exitosamente!')
    console.log(`   Email:    ${EMAIL}`)
    console.log(`   Password: ${PASSWORD}`)
    console.log(`   Acceso:   https://admin.petfhans.com\n`)
  }
}

main().catch(console.error)
