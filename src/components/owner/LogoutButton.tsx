'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button onClick={logout} style={{
      border: '1.5px solid rgba(238,114,109,.4)',
      background: 'transparent',
      color: '#EE726D',
      borderRadius: 20,
      padding: '6px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap',
    }}>
      Cerrar sesión
    </button>
  )
}
