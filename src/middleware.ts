import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  // Detectar subdominio
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'petfhans.com'
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')

  let subdomain = ''
  if (!isLocalhost) {
    // Extraer subdominio: "clinicaejemplo.petfhans.com" → "clinicaejemplo"
    if (hostname.endsWith(`.${baseDomain}`)) {
      subdomain = hostname.replace(`.${baseDomain}`, '')
    }
  } else {
    // En desarrollo: usar header x-subdomain o query param ?subdomain=xxx
    subdomain = request.headers.get('x-subdomain') ?? url.searchParams.get('subdomain') ?? ''
  }

  // Inyectar subdominio en headers para que las páginas lo lean
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-subdomain', subdomain)
  requestHeaders.set('x-hostname', hostname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = url.pathname

  // Rutas públicas (landing, auth, invitaciones)
  const publicPaths = ['/auth/login', '/auth/register', '/auth/invite', '/auth/verify-email', '/auth/callback', '/api/invite/validate', '/api/auth/validate-invite', '/api/auth/accept-invite', '/webhook/']
  if (publicPaths.some(p => path.startsWith(p)) || subdomain === '') {
    return supabaseResponse
  }

  // Redirigir a login si no autenticado — preservar URL de destino en ?next=
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url)
    if (!path.startsWith('/auth')) {
      loginUrl.searchParams.set('next', path)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Validar acceso por subdominio y rol
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clinic_id, clinics(slug)')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role
    type ProfileRow = { role: string; clinic_id: string | null; clinics: { slug: string } | null }
    const clinicSlug = (profile as ProfileRow | null)?.clinics?.slug

    // Super admin → solo puede entrar a admin.*
    if (subdomain === 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Veterinaria → validar que el subdominio corresponde a su clínica
    if (subdomain !== 'admin' && role !== 'superadmin') {
      if (clinicSlug && clinicSlug !== subdomain) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
