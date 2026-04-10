import { fetchContent } from '@/lib/server/social/fetch-content'
import { persistSocialIngestForJob } from '@/lib/server/social/ingest'
import type { IngestSocialRequest } from '@/lib/social/extraction-contract'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type JobRow = Database['public']['Tables']['social_ingest_jobs']['Row']

async function updateProgress(jobId: string, message: string): Promise<void> {
  const admin = getAdminSupabase()
  await admin
    .from('social_ingest_jobs')
    .update({ progress_message: message, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

function buildIngestRequest(
  job: JobRow,
  fetched: import('@/lib/server/social/fetch-content').FetchedContent
): IngestSocialRequest {
  const platform: IngestSocialRequest['platform'] =
    fetched.platform === 'youtube'
      ? 'youtube'
      : fetched.platform === 'blog'
        ? 'blog'
        : 'other'

  const hint = job.location_hint as { lat?: number; lng?: number; city?: string } | null

  return {
    url: fetched.url,
    platform,
    author_name: fetched.author_name,
    title: fetched.title,
    transcript: fetched.transcript,
    ...(hint &&
    typeof hint.lat === 'number' &&
    typeof hint.lng === 'number'
      ? { location_hint: { lat: hint.lat, lng: hint.lng, city: hint.city } }
      : {}),
  }
}

export async function runClaimedSocialIngestJob(job: JobRow): Promise<void> {
  const admin = getAdminSupabase()
  try {
    await updateProgress(job.id, 'Fetching content...')
    const fetchStart = Date.now()
    const fetchResult = await fetchContent(job.url)
    const fetchMs = Date.now() - fetchStart

    if ('error' in fetchResult) {
      await admin
        .from('social_ingest_jobs')
        .update({
          status: 'failed',
          error_message: fetchResult.error,
          fetch_ms: fetchMs,
        })
        .eq('id', job.id)
      return
    }

    // Persist fetch timing early so UI can surface it while the worker continues.
    await admin.from('social_ingest_jobs').update({ fetch_ms: fetchMs }).eq('id', job.id)

    await updateProgress(job.id, 'Extracting places from transcript...')
    const request = buildIngestRequest(job, fetchResult)
    await persistSocialIngestForJob(request, job.id, (msg) => {
      void updateProgress(job.id, msg)
    })
  } catch (e) {
    await admin
      .from('social_ingest_jobs')
      .update({
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'social_ingest_job_failed',
      })
      .eq('id', job.id)
  }
}
