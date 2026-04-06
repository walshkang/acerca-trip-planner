import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Test-only endpoint: generates a magic-link OTP for a given email via the
 * admin API and verifies it server-side so the Supabase session cookies are
 * set on the response. Playwright global-setup calls this instead of launching
 * a headless browser that would need to reach supabase.co.
 *
 * Guarded by PLAYWRIGHT_SEED_TOKEN (same as /api/test/seed) and disabled in
 * production.
 */

function isEnabled(): boolean {
  if (process.env.PLAYWRIGHT_ENABLE_SEED === 'true') return true
  return process.env.NODE_ENV !== 'production'
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  const provided = request.headers.get('x-seed-token')
  if (!seedToken || provided !== seedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  // Generate a magic-link OTP via the admin API (no email sent)
  const admin = getAdminSupabase()
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData?.properties?.email_otp) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Failed to generate OTP' },
      { status: 500 }
    )
  }

  // Verify the OTP using the server-side client — @supabase/ssr sets session
  // cookies on the response via the Next.js cookie store.
  const supabase = await createClient()
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'email',
  })

  if (verifyError || !sessionData.session) {
    return NextResponse.json(
      { error: verifyError?.message ?? 'OTP verification failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, user_id: sessionData.session.user.id })
}
