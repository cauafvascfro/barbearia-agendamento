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
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.setAll(supabaseResponse.cookies.getAll())
    copyCacheHeaders(supabaseResponse, response)
    return response
  }

  if (isLoginRoute && data?.claims) {
    const response = NextResponse.redirect(new URL('/admin', request.url))
    response.cookies.setAll(supabaseResponse.cookies.getAll())
    copyCacheHeaders(supabaseResponse, response)
    return response
  }

  return supabaseResponse
}

function copyCacheHeaders(from: NextResponse, to: NextResponse) {
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = from.headers.get(header)
    if (value) to.headers.set(header, value)
  }
}
