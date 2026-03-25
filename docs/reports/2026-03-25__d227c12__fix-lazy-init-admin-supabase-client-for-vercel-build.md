# Learning Report: fix: lazy-init admin Supabase client for Vercel build

- Date: 2026-03-25
- Commit: d227c1289dc6e8798f0781bc5e68d47002c96f74
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: lazy-init admin Supabase client for Vercel build"

## What Changed
```
M	lib/server/enrichment/linkCandidateEnrichment.ts
M	lib/server/enrichment/normalize.ts
M	lib/server/filters/open-now-telemetry.ts
M	lib/server/places/getPlaceEnrichment.ts
M	lib/server/testSeed.ts
M	lib/supabase/admin.ts
M	tests/enrichment/linkCandidateEnrichment.test.ts
M	tests/filters/open-now-telemetry.test.ts
```

## File Stats
```
 lib/server/enrichment/linkCandidateEnrichment.ts |  4 +--
 lib/server/enrichment/normalize.ts               |  4 +--
 lib/server/filters/open-now-telemetry.ts         |  4 +--
 lib/server/places/getPlaceEnrichment.ts          |  4 +--
 lib/server/testSeed.ts                           |  4 +--
 lib/supabase/admin.ts                            | 35 ++++++++++++++++--------
 tests/enrichment/linkCandidateEnrichment.test.ts |  4 +--
 tests/filters/open-now-telemetry.test.ts         |  4 +--
 8 files changed, 37 insertions(+), 26 deletions(-)
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
