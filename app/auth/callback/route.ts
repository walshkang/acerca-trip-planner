import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  // Build the redirect response first so we can attach session cookies directly
  // to it. Using cookies() + cookieStore.set() in a Route Handler that returns
  // NextResponse.redirect() is unreliable in Next.js 14 — the Set-Cookie headers
  // may not be forwarded on the redirect response, leaving the user unauthenticated.
  const redirectTo = new URL(next, url.origin)
  const response = NextResponse.redirect(redirectTo)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Exchange failed (e.g. code already used, PKCE verifier missing).
      // Redirect to sign-in so the user can try again rather than landing
      // silently unauthenticated.
      const signInUrl = new URL('/auth/sign-in', url.origin)
      signInUrl.searchParams.set('next', next)
      return NextResponse.redirect(signInUrl)
    }
  }

  return response
}
