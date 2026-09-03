import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// '/' used to be matched here too, redirecting an unauthenticated request
// straight to /login before Next.js rendered anything at all. page.tsx
// already does the identical getCurrentUser() check and redirect on its
// own, so that was redundant — and worse, it meant every cold launch paid
// for this Supabase round trip (measured at 2-3+ seconds in production)
// before a single byte of the splash screen could be sent. Session
// refresh for '/' now happens separately, from the client right after the
// splash mounts (see splash-screen.tsx and /api/refresh-session) — this
// middleware only needs to keep the '/login' bounce-back for a user who's
// already signed in.
export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ?? null

  if (user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/login'],
}
