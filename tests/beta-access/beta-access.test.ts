/**
 * Playwright / CI: keep `BETA_ACCESS_PASSWORD` unset so the gate is off, or set the
 * `acerca_beta` cookie in globalSetup if you need E2E against a gated deploy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/beta-unlock/route'
import {
  decideBetaAccess,
  safeNextPath,
  signBetaToken,
  verifyBetaToken,
} from '@/lib/beta-access'

const BASE = 'https://example.com'

describe('safeNextPath', () => {
  it('defaults for null and empty', () => {
    expect(safeNextPath(null, `${BASE}/x`)).toBe('/')
    expect(safeNextPath('', `${BASE}/x`)).toBe('/')
  })

  it('rejects protocol and protocol-relative', () => {
    expect(safeNextPath('https://evil.com/', `${BASE}/`)).toBe('/')
    expect(safeNextPath('//evil.com/x', `${BASE}/`)).toBe('/')
    expect(safeNextPath('/ok', `${BASE}/`)).toBe('/ok')
  })

  it('rejects absolute URL to another host', () => {
    expect(
      safeNextPath('https://evil.com/phish', 'https://example.com/page')
    ).toBe('/')
  })

  it('allows same-origin path with search', () => {
    expect(safeNextPath('/lists?a=1', `${BASE}/beta`)).toBe('/lists?a=1')
  })
})

describe('signBetaToken / verifyBetaToken', () => {
  const password = 'test-beta-pw'
  const now = 1_700_000_000

  it('round-trips valid token', async () => {
    const { token, exp } = await signBetaToken(password, now, 3600)
    const v = await verifyBetaToken(password, token, now + 10)
    expect(v).toEqual({ status: 'valid', exp })
  })

  it('returns expired after exp', async () => {
    const { token, exp } = await signBetaToken(password, now, 60)
    const v = await verifyBetaToken(password, token, now + 120)
    expect(v).toEqual({ status: 'expired', exp })
  })

  it('returns missing for empty cookie', async () => {
    const v = await verifyBetaToken(password, undefined, now)
    expect(v).toEqual({ status: 'missing' })
  })

  it('returns invalid_sig for tampered token', async () => {
    const { token } = await signBetaToken(password, now, 3600)
    const tampered = token.slice(0, -4) + 'xxxx'
    const v = await verifyBetaToken(password, tampered, now + 10)
    expect(v).toEqual({ status: 'invalid_sig' })
  })

  it('returns invalid_sig for wrong password key', async () => {
    const { token } = await signBetaToken(password, now, 3600)
    const v = await verifyBetaToken('other-password', token, now + 10)
    expect(v).toEqual({ status: 'invalid_sig' })
  })
})

describe('decideBetaAccess', () => {
  const pwd = 'gate-secret'
  const now = 1_700_000_000

  it('allows all when password unset', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/lists`,
      pathname: '/lists',
      search: '',
      method: 'GET',
      cookieHeader: null,
      betaPassword: undefined,
      nowSec: now,
    })
    expect(d).toEqual({ kind: 'allow' })
  })

  it('redirects /beta to / when gate off', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/beta`,
      pathname: '/beta',
      search: '',
      method: 'GET',
      cookieHeader: null,
      betaPassword: '',
      nowSec: now,
    })
    expect(d).toEqual({
      kind: 'redirect',
      location: `${BASE}/`,
    })
  })

  it('allows /auth/sign-in without cookie when gate on', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/auth/sign-in`,
      pathname: '/auth/sign-in',
      search: '',
      method: 'GET',
      cookieHeader: null,
      betaPassword: pwd,
      nowSec: now,
    })
    expect(d).toEqual({ kind: 'allow' })
  })

  it('allows POST /api/beta-unlock without cookie', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/api/beta-unlock`,
      pathname: '/api/beta-unlock',
      search: '',
      method: 'POST',
      cookieHeader: null,
      betaPassword: pwd,
      nowSec: now,
    })
    expect(d).toEqual({ kind: 'allow' })
  })

  it('returns json401 when API called without cookie', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/api/places/search?q=x`,
      pathname: '/api/places/search',
      search: '?q=x',
      method: 'GET',
      cookieHeader: null,
      betaPassword: pwd,
      nowSec: now,
    })
    expect(d).toEqual({ kind: 'json401', code: 'beta_required' })
  })

  it('redirects page without cookie to /beta with next', async () => {
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/ingest`,
      pathname: '/ingest',
      search: '',
      method: 'GET',
      cookieHeader: null,
      betaPassword: pwd,
      nowSec: now,
    })
    expect(d).toEqual({
      kind: 'redirect',
      location: `${BASE}/beta?next=%2Fingest`,
    })
  })

  it('allows when cookie valid', async () => {
    const { token } = await signBetaToken(pwd, now, 3600)
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/`,
      pathname: '/',
      search: '',
      method: 'GET',
      cookieHeader: `acerca_beta=${token}`,
      betaPassword: pwd,
      nowSec: now + 10,
    })
    expect(d).toEqual({ kind: 'allow' })
  })

  it('returns beta_expired for API when token expired', async () => {
    const { token } = await signBetaToken(pwd, now, 60)
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/api/x`,
      pathname: '/api/x',
      search: '',
      method: 'GET',
      cookieHeader: `acerca_beta=${token}`,
      betaPassword: pwd,
      nowSec: now + 120,
    })
    expect(d).toEqual({ kind: 'json401', code: 'beta_expired' })
  })

  it('redirects page to /beta with reason=expired when token expired', async () => {
    const { token } = await signBetaToken(pwd, now, 60)
    const d = await decideBetaAccess({
      requestUrl: `${BASE}/lists`,
      pathname: '/lists',
      search: '',
      method: 'GET',
      cookieHeader: `acerca_beta=${token}`,
      betaPassword: pwd,
      nowSec: now + 120,
    })
    expect(d.kind).toBe('redirect')
    if (d.kind === 'redirect') {
      const u = new URL(d.location)
      expect(u.pathname).toBe('/beta')
      expect(u.searchParams.get('reason')).toBe('expired')
      expect(u.searchParams.get('next')).toBe('/lists')
    }
  })
})

describe('POST /api/beta-unlock', () => {
  beforeEach(() => {
    vi.stubEnv('BETA_ACCESS_PASSWORD', 'correct')
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 404 when gate not configured', async () => {
    vi.stubEnv('BETA_ACCESS_PASSWORD', '')
    const res = await POST(
      new Request(`${BASE}/api/beta-unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'x' }),
      })
    )
    expect(res.status).toBe(404)
  })

  it('returns 401 for wrong password without Set-Cookie', async () => {
    const res = await POST(
      new Request(`${BASE}/api/beta-unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      })
    )
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('returns 200 and sets cookie for correct password', async () => {
    const res = await POST(
      new Request(`${BASE}/api/beta-unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct' }),
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok?: boolean }
    expect(json.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toMatch(/acerca_beta=/)
    expect(setCookie?.toLowerCase()).toMatch(/httponly/)
  })
})
