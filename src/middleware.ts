import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Rutas públicas
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/invite']
  if (publicRoutes.some(r => path.startsWith(r))) {
    return supabaseResponse
  }

  // Redirigir a login si no está autenticado
  if (!user && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Obtener rol del usuario
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role

    // Proteger rutas por rol
    if (path.startsWith('/admin') && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (path.startsWith('/vet') && !['vet_admin', 'veterinarian'].includes(role ?? '')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (path.startsWith('/owner') && role !== 'pet_owner') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
