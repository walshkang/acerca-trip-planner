# Learning Report: feat: add places search endpoint

- Date: 2026-01-27
- Commit: 73c8749af07896a793b80d82ecec2528579d1c13
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add places search endpoint"

## What Changed
```
A	app/api/places/search/route.ts
M	lib/enrichment/sources.ts
A	tests/enrichment/googlePlacesSearch.test.ts
```

## File Stats
```
 app/api/places/search/route.ts              | 52 +++++++++++++++++
 lib/enrichment/sources.ts                   | 87 +++++++++++++++++++++++------
 tests/enrichment/googlePlacesSearch.test.ts | 47 ++++++++++++++++
 3 files changed, 168 insertions(+), 18 deletions(-)
```

## Decisions / Rationale
- Added `/api/places/search` to return lightweight Google Find Place candidates so the Omnibox can list results without triggering enrichment.
- Reused the deterministic Google Places fetch helpers to keep retry/timeout behavior consistent with existing enrichment fetches.
- Returned only `place_id`, name, and formatted address to keep payloads small and defer enrichment until preview ingest.
- Added focused tests for OK and ZERO_RESULTS responses to lock in behavior without introducing network calls.

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
- Wire the Omnibox to call `/api/places/search` and render results.
- Expand the discovery store to track results and preview selection.
- Gate the InspectorCard on preview state and rename “Add to Plan” to “Approve Pin.”
