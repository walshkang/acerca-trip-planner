import { NextResponse } from 'next/server'
import {
  BETA_COOKIE_NAME,
  BETA_TOKEN_TTL_SEC,
  compareBetaPassword,
  signBetaToken,
} from '@/lib/beta-access'

export async function POST(request: Request) {
  const password = process.env.BETA_ACCESS_PASSWORD?.trim()
  if (!password) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rec = body as Record<string, unknown>
  const provided =
    typeof rec.password === 'string' ? rec.password : ''

  const ok = await compareBetaPassword(provided, password)
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const { token, maxAgeSec } = await signBetaToken(
    password,
    nowSec,
    BETA_TOKEN_TTL_SEC
  )

  const secure =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  const res = NextResponse.json({ ok: true })
  res.cookies.set(BETA_COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    maxAge: maxAgeSec,
    sameSite: 'lax',
    secure,
  })
  return res
}
