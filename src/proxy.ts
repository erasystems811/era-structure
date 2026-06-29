import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  // Public routes — admin API uses X-Operator-Secret, not Supabase session
  if (path === '/login' || path.startsWith('/api/admin') || path.startsWith('/api/webhooks')) {
    return supabaseResponse
  }

  // Not logged in — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user role from profiles
  const { data: profile } = await supabase
    .from('owner_profiles')
    .select('role, business_id')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isClient = profile?.role === 'client'

  // Admin trying to access client routes — redirect to admin
  if (isAdmin && path.startsWith('/app')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Client trying to access admin — redirect to app
  if (isClient && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/app/assessment', request.url))
  }

  // Check if client account is locked
  if (isClient && !path.startsWith('/app/locked') && !path.startsWith('/api')) {
    const { data: business } = await supabase
      .from('businesses')
      .select('is_locked')
      .eq('id', profile.business_id)
      .single()

    if (business?.is_locked) {
      return NextResponse.redirect(new URL('/app/locked', request.url))
    }
  }

  // Root redirect
  if (path === '/') {
    if (isAdmin) return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    if (isClient) return NextResponse.redirect(new URL('/app/assessment', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
