import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginRoute = request.nextUrl.pathname === '/login'

  if (isAdminRoute && !data?.claims) {
    return redirectWithSession(request, supabaseResponse, '/login')
  }

  if (isLoginRoute && data?.claims) {
    return redirectWithSession(request, supabaseResponse, '/admin')
  }

  return supabaseResponse
}

function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
) {
  const response = NextResponse.redirect(new URL(pathname, request.url))

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie)
  })

  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = sessionResponse.headers.get(header)
    if (value) response.headers.set(header, value)
  }

  return response
}
