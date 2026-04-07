import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const locationHint = body?.location_hint
  const location_hint =
    locationHint && typeof locationHint === 'object' && locationHint !== null
      ? locationHint
      : null

  const insertPayload = {
    user_id: user.id,
    url,
    status: 'queued' as const,
    location_hint,
  }

  let { data, error } = await supabase
    .from('social_ingest_jobs')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error?.code === '23505') {
    const { data: existing } = await supabase
      .from('social_ingest_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', url)
      .in('status', ['queued', 'running'])
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ job_id: existing.id, deduped: true })
    }
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'insert_failed' },
      { status: 500 }
    )
  }

  // In local dev, the Vercel cron doesn't run — kick the worker immediately so
  // the Realtime subscription in SocialUrlIngest gets the completion event.
  if (process.env.NODE_ENV === 'development') {
    const workerSecret =
      process.env.PROCESS_SOCIAL_JOBS_KEY?.trim() ||
      process.env.CRON_SECRET?.trim()
    if (workerSecret) {
      const base = request.nextUrl.origin
      void fetch(`${base}/api/internal/process-social-jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${workerSecret}` },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ job_id: data.id })
}
