import { getBetaCookieFromHeader } from './cookies'
import { verifyBetaToken } from './token'

export type BetaAccessDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; location: string }
  | { kind: 'json401'; code: 'beta_required' | 'beta_expired' }

export async function decideBetaAccess(input: {
  requestUrl: string
  pathname: string
  search: string
  method: string
  cookieHeader: string | null
  betaPassword: string | undefined | null
  nowSec?: number
}): Promise<BetaAccessDecision> {
  const pwd =
    typeof input.betaPassword === 'string' ? input.betaPassword.trim() : ''
  const now = input.nowSec ?? Math.floor(Date.now() / 1000)

  if (!pwd) {
    if (input.pathname === '/beta') {
      return {
        kind: 'redirect',
        location: new URL('/', input.requestUrl).toString(),
      }
    }
    return { kind: 'allow' }
  }

  if (input.pathname === '/auth' || input.pathname.startsWith('/auth/')) {
    return { kind: 'allow' }
  }
  if (input.pathname === '/beta') {
    return { kind: 'allow' }
  }
  if (input.pathname === '/api/beta-unlock' && input.method === 'POST') {
    return { kind: 'allow' }
  }

  const cookie = getBetaCookieFromHeader(input.cookieHeader)
  const result = await verifyBetaToken(pwd, cookie, now)

  if (result.status === 'valid') {
    return { kind: 'allow' }
  }

  const nextParam = encodeURIComponent(input.pathname + input.search)
  const betaUrl = new URL(`/beta?next=${nextParam}`, input.requestUrl)

  if (result.status === 'expired') {
    betaUrl.searchParams.set('reason', 'expired')
    if (input.pathname.startsWith('/api/')) {
      return { kind: 'json401', code: 'beta_expired' }
    }
    return { kind: 'redirect', location: betaUrl.toString() }
  }

  if (input.pathname.startsWith('/api/')) {
    return { kind: 'json401', code: 'beta_required' }
  }
  return { kind: 'redirect', location: betaUrl.toString() }
}
