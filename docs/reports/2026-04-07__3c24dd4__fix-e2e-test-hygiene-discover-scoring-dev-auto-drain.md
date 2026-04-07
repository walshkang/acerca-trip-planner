# Learning Report: fix: e2e test hygiene, discover scoring, dev auto-drain

- Date: 2026-04-07
- Commit: 3c24dd4a939ce468c9fe728b2372834b94c535ed
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: e2e test hygiene, discover scoring, dev auto-drain"

## What Changed
```
M	app/api/enrichment/enqueue-social-job/route.ts
M	components/stitch/ListDetailBody.tsx
M	lib/server/discovery/suggest.ts
M	tests/discovery/suggest-route.test.ts
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/social-url-ingest.spec.ts
```

## File Stats
```
 app/api/enrichment/enqueue-social-job/route.ts |  15 +
 components/stitch/ListDetailBody.tsx           |   2 +-
 lib/server/discovery/suggest.ts                |   4 +-
 tests/discovery/suggest-route.test.ts          |  12 +-
 tests/e2e/list-filters-and-map-link.spec.ts    |  46 +-
 tests/e2e/list-local-search.spec.ts            |   8 +-
 tests/e2e/list-planner-move.spec.ts            | 825 +------------------------
 tests/e2e/social-url-ingest.spec.ts            |   1 -
 8 files changed, 72 insertions(+), 841 deletions(-)
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
