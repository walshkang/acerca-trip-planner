# Learning Report: feat: expand discovery store for search

- Date: 2026-01-27
- Commit: 642477c9686c35d69592b42ea9841a7311b3935c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: expand discovery store for search"

## What Changed
```
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 lib/state/useDiscoveryStore.ts | 51 ++++++++++++++++++++++++++++++++++++++----
 1 file changed, 47 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Added `results`, `selectedResultId`, `previewCandidate`, and `previewEnrichment` to support the upcoming search → preview ingest flow.
- Kept existing `candidate`/`enrichment` fields in sync to avoid breaking current Omnibox and Inspector usage.
- Introduced setters for results/selection/preview to make the next wiring steps incremental.

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
- Call `/api/places/search` from the Omnibox and render results.
- Trigger preview ingest on selection and gate InspectorCard on preview state.
- Rename “Add to Plan” to “Approve Pin” until lists exist.
