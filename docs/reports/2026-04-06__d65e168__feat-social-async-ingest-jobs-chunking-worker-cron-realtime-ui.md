# Learning Report: feat(social): async ingest jobs, chunking, worker cron, Realtime UI

- Date: 2026-04-06
- Commit: d65e168dacfe0e4ab9e78b65be2b7644c2577db1
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(social): async ingest jobs, chunking, worker cron, Realtime UI"

## What Changed
```
M	.env.example
M	CONTEXT.md
A	app/api/enrichment/enqueue-social-job/route.ts
A	app/api/enrichment/social-ingest-job/[id]/route.ts
A	app/api/internal/process-social-jobs/route.ts
M	components/stitch/SocialUrlIngest.tsx
M	lib/server/social/ingest.ts
A	lib/server/social/process-ingest-job.ts
M	lib/social/extraction-contract.ts
A	lib/social/social-ingest-url.ts
A	lib/social/transcript-chunks.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260408000001_social_ingest_jobs.sql
M	tests/e2e/social-url-ingest.spec.ts
A	tests/social/social-ingest-url.test.ts
A	tests/social/transcript-chunks.test.ts
A	vercel.json
```

## File Stats
```
 .env.example                                       |   9 +
 CONTEXT.md                                         |   5 +-
 app/api/enrichment/enqueue-social-job/route.ts     |  62 ++++++
 app/api/enrichment/social-ingest-job/[id]/route.ts |  33 +++
 app/api/internal/process-social-jobs/route.ts      |  46 +++++
 components/stitch/SocialUrlIngest.tsx              | 230 ++++++++++++++-------
 lib/server/social/ingest.ts                        | 168 +++++++++++++--
 lib/server/social/process-ingest-job.ts            |  62 ++++++
 lib/social/extraction-contract.ts                  |  31 ++-
 lib/social/social-ingest-url.ts                    |  25 +++
 lib/social/transcript-chunks.ts                    | 135 ++++++++++++
 lib/supabase/types.ts                              |  57 +++++
 .../20260408000001_social_ingest_jobs.sql          |  75 +++++++
 tests/e2e/social-url-ingest.spec.ts                |   5 +-
 tests/social/social-ingest-url.test.ts             |  23 +++
 tests/social/transcript-chunks.test.ts             | 101 +++++++++
 vercel.json                                        |   8 +
 17 files changed, 974 insertions(+), 101 deletions(-)
```

## Decisions / Rationale
- Auto-generated from commit metadata. If this report is included in a PR, replace this line with concrete rationale and tradeoffs from the implementation.

## Best Practices: Backend Connections
- Use server-side clients for privileged operations; avoid admin/service keys in client code.
- Keep anon keys in `NEXT_PUBLIC_...` and service role in server-only env vars.
- Prefer RPC or server routes for writes; keep validation server-side.
- Centralize client creation and reuse helpers (`lib/supabase/server.ts`, `lib/supabase/client.ts`).

Example (server-side Supabase):
```ts
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.rpc('promote_place_candidate', {
  p_candidate_id: candidateId,
})
```

## Efficiency Tips
- Start with smallest reproducible change, then expand.
- Add tight tests for new logic and edge cases.
- Capture TODOs in commit message or report immediately.

## Next Steps
- No follow-up actions were captured automatically.
