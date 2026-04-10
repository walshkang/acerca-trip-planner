# Learning Report: feat(social): add telemetry to social_ingest_jobs and persist telemetry

- Date: 2026-04-10
- Commit: e898b8a831e9fb90553c226dc4aa6f8a8a1bf161
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(social): add telemetry to social_ingest_jobs and persist telemetry"

## What Changed
```
A	app/api/enrichment/social-ingest-job/__tests__/route.test.ts
M	lib/server/social/ingest.ts
M	lib/server/social/process-ingest-job.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260410140620_social_ingest_jobs_telemetry.sql
```

## File Stats
```
 .../social-ingest-job/__tests__/route.test.ts      |  69 +++++++++
 lib/server/social/ingest.ts                        | 156 ++++++++-------------
 lib/server/social/process-ingest-job.ts            |   7 +
 lib/supabase/types.ts                              | 148 ++++++++++++++++++-
 ...20260410140620_social_ingest_jobs_telemetry.sql |   8 ++
 5 files changed, 286 insertions(+), 102 deletions(-)
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
