'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ variant = 'default' }: { variant?: 'default' | 'danger' }) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (variant === 'danger') {
    return (
      <button
        onClick={logout}
        style={{
          width: '100%', padding: '12px 16px',
          background: '#fff1f0', color: '#dc2626',
          border: '1px solid #fecaca', borderRadius: 14,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'inherit', transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff1f0')}
      >
        <LogOut size={16} strokeWidth={2} />
        Cerrar sesión
      </button>
    )
  }

  return (
    <button
      onClick={logout}
      style={{
        border: '1.5px solid rgba(238,114,109,.4)',
        background: 'transparent',
        color: 'var(--pf-coral)',
        borderRadius: 20, padding: '6px 16px',
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}
    >
      Cerrar sesión
    </button>
  )
}
