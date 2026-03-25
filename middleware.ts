import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { decideBetaAccess } from '@/lib/beta-access'

export async function middleware(request: NextRequest) {
  const betaPassword = process.env.BETA_ACCESS_PASSWORD
  const url = request.nextUrl

  const decision = await decideBetaAccess({
    requestUrl: request.url,
    pathname: url.pathname,
    search: url.search,
    method: request.method,
    cookieHeader: request.headers.get('cookie'),
    betaPassword,
  })

  if (decision.kind === 'allow') {
    return NextResponse.next()
  }
  if (decision.kind === 'redirect') {
    return NextResponse.redirect(decision.location)
  }
  return NextResponse.json(
    { error: 'Beta access required', code: decision.code },
    { status: 401 }
  )
}

export const config = {
  matcher: [
    // Exclude static assets; `/map/*` is large binaries — avoid 302 HTML on tile fetch.
    '/((?!_next/static|_next/image|favicon.ico|icons/|map/).*)',
  ],
}
