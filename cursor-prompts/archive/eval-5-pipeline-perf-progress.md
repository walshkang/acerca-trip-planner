# Social Pipeline — Slice 5: Performance + Progress UX

## Goal

Cut end-to-end ingest time (~142s for a 30-min video) and show incremental progress in the UI while the job runs. Two independent improvements, ship together.

---

## Files to read first

- `lib/server/social/ingest.ts` — `persistSocialIngest`, the sequential `for...of` place resolution loop (~line 298)
- `lib/server/social/process-ingest-job.ts` — `runClaimedSocialIngestJob` (where to write progress milestones)
- `supabase/migrations/20260408000001_social_ingest_jobs.sql` — `social_ingest_jobs` schema (most recent migration)
- wherever the URL paste UI listens to job status (search for `social_ingest_jobs` subscription or `job_id` in components)

---

## Changes

### 1. Migration: add `progress_message` to `social_ingest_jobs`

New file: `supabase/migrations/20260409000002_social_ingest_jobs_progress.sql`

```sql
ALTER TABLE public.social_ingest_jobs
  ADD COLUMN IF NOT EXISTS progress_message TEXT;
```

Run `npm run db:types` after applying.

---

### 2. Parallelize Google Places resolution in `lib/server/social/ingest.ts`

The current resolution loop processes each mention sequentially. For a 22-place video that's ~80–100s of serial Google API calls. Replace with a batched parallel approach.

Find the `for (const mention of extractedMentions)` loop inside `persistSocialIngest` and replace it with:

```typescript
const PLACES_BATCH_SIZE = 5

const allResults = await Promise.all(
  chunk(extractedMentions, PLACES_BATCH_SIZE).map((batch) =>
    Promise.all(
      batch.map(async (mention) => {
        try {
          const searchQuery = mention.place_type
            ? `${mention.place_name} ${mention.place_type}`
            : mention.place_name

          const matches = await searchGooglePlaces(searchQuery, {
            locationBias:
              typeof request.location_hint?.lat === 'number' &&
              typeof request.location_hint?.lng === 'number'
                ? {
                    lat: request.location_hint.lat,
                    lng: request.location_hint.lng,
                    radiusMeters: 50_000,
                  }
                : undefined,
          })

          const top = matches[0]
          const googlePlaceId = top?.place_id
          const lat = top?.geometry?.location?.lat
          const lng = top?.geometry?.location?.lng

          if (!googlePlaceId || typeof lat !== 'number' || typeof lng !== 'number') {
            return { ok: false as const, place_name: mention.place_name, reason: 'no_google_match' }
          }

          const placeId = await ensurePlaceId({
            sourceUserId,
            googlePlaceId,
            name: top.name?.trim() || mention.place_name,
            lat,
            lng,
            googleTypes: Array.isArray(top.types) ? (top.types as string[]) : undefined,
            googleRating: typeof top.rating === 'number' ? top.rating : undefined,
            googleReviewCount:
              typeof top.user_ratings_total === 'number' ? top.user_ratings_total : undefined,
          })

          const mentionInsert = await supabase.from('social_mentions').upsert(
            {
              source_id: sourceId,
              place_id: placeId,
              snippet: mention.context_snippet,
              sentiment: mention.sentiment,
              tags: mention.tags ?? [],
              callouts: mention.callouts ? JSON.parse(JSON.stringify(mention.callouts)) : [],
            },
            { onConflict: 'source_id,place_id' }
          )

          if (mentionInsert.error) {
            throw new Error(`social_mentions_insert_failed:${mentionInsert.error.message}`)
          }

          return { ok: true as const }
        } catch (error) {
          return {
            ok: false as const,
            place_name: mention.place_name,
            reason: error instanceof Error ? error.message : 'place_resolution_failed',
          }
        }
      })
    )
  )
)

const flatResults = allResults.flat()
const failures: IngestFailure[] = flatResults
  .filter((r) => !r.ok)
  .map((r) => ({ place_name: (r as { place_name: string }).place_name, reason: (r as { reason: string }).reason }))
const placesResolved = flatResults.filter((r) => r.ok).length
```

Add a local `chunk` helper above `persistSocialIngest` (do not import a library for this):

```typescript
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
```

**Why batches of 5, not all at once:** Google Places has per-second rate limits. Unbounded parallel calls on a 22-place video would likely hit 429s. Batches of 5 should stay well under the limit while cutting total time from ~90s to ~20s for place resolution.

---

### 3. Write `progress_message` milestones in `lib/server/social/process-ingest-job.ts`

The job row already has Realtime enabled on the table. Add a helper and call it at each milestone:

```typescript
async function updateProgress(jobId: string, message: string): Promise<void> {
  const admin = getAdminSupabase()
  await admin
    .from('social_ingest_jobs')
    .update({ progress_message: message, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}
```

Update `runClaimedSocialIngestJob` to call it at each stage:

```typescript
export async function runClaimedSocialIngestJob(job: JobRow): Promise<void> {
  try {
    await updateProgress(job.id, 'Fetching content...')
    const fetchResult = await fetchContent(job.url)
    // ... error handling unchanged ...

    await updateProgress(job.id, 'Extracting places from transcript...')
    const request = buildIngestRequest(job, fetchResult)
    await persistSocialIngestForJob(request, job.id)
  } catch (e) {
    // ... error handling unchanged ...
  }
}
```

Also update `persistSocialIngest` to accept an optional `onProgress` callback so the resolution step can report count:

```typescript
export async function persistSocialIngest(
  request: IngestSocialRequest,
  onProgress?: (msg: string) => void
): Promise<IngestSocialResult> {
  // ...after extractedMentions is computed:
  onProgress?.(`Resolving ${extractedMentions.length} places...`)
  // ...after allResults.flat():
  onProgress?.(`Done — ${placesResolved} places added`)
}
```

In `persistSocialIngestForJob`, thread the callback:

```typescript
export async function persistSocialIngestForJob(
  request: IngestSocialRequest,
  jobId: string
): Promise<IngestSocialResult> {
  const result = await persistSocialIngest(request, (msg) => {
    void updateProgress(jobId, msg)
  })
  // ... rest unchanged ...
}
```

Note: `updateProgress` is fire-and-forget inside the callback (`void`) — we don't await it so it doesn't block the pipeline.

---

### 4. Show `progress_message` in the URL paste UI

Find the component that shows job status while `status = 'running'` (likely near the `social_ingest_jobs` Realtime subscription). The job row already arrives via Realtime on each `updated_at` change.

- While `status === 'running'`: render `job.progress_message ?? 'Processing...'` as a status line under the source card (small muted text, no spinner needed — the message itself communicates progress)
- When `status === 'succeeded'`: replace with place count from `places_resolved`
- When `status === 'failed'`: render `error_message`

Do not add a progress bar or percentage — the message text is sufficient.

---

## Expected time improvement

| Phase | Before | After |
|-------|--------|-------|
| Fetch content | ~5s | ~5s |
| LLM extraction | ~35s | ~35s |
| Place resolution (22 places) | ~90s | ~20s |
| **Total** | **~130s** | **~60s** |

The LLM extraction time is mostly fixed (chunk batching is already parallel). Place resolution is the lever.

---

## Definition of Done

- [ ] Migration applies cleanly, `npm run db:types` regenerates
- [ ] `persistSocialIngest` uses batched parallel resolution (5 at a time)
- [ ] Re-ingesting the same 30-min video completes in under 70s
- [ ] `progress_message` updates appear in the UI at: "Fetching content...", "Extracting places...", "Resolving N places...", "Done — N places added"
- [ ] No 429 errors from Google Places API (if they appear, reduce `PLACES_BATCH_SIZE` to 3)
- [ ] Existing integration tests still pass (`npm run test`)
- [ ] `npm run check` passes
