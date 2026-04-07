import { NextRequest, NextResponse } from 'next/server'
import { runClaimedSocialIngestJob } from '@/lib/server/social/process-ingest-job'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function authorize(request: NextRequest): boolean {
  const secret =
    process.env.PROCESS_SOCIAL_JOBS_KEY?.trim() ||
    process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (request.headers.get('x-process-social-jobs-key') === secret) return true
  return false
}

async function runWorker(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminSupabase()
  const { data: job, error } = await admin.rpc('claim_next_social_job', {})

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!job) {
    return NextResponse.json({ processed: 0 })
  }

  await runClaimedSocialIngestJob(job)
  return NextResponse.json({ processed: 1, job_id: job.id })
}

/** Vercel Cron invokes GET. */
export async function GET(request: NextRequest) {
  return runWorker(request)
}

export async function POST(request: NextRequest) {
  return runWorker(request)
}
