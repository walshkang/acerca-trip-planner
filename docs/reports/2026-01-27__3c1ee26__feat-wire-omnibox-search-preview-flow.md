# Learning Report: feat: wire omnibox search preview flow

- Date: 2026-01-27
- Commit: 3c1ee264be2c043b01da4742d9bf8307468b53a7
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: wire omnibox search preview flow"

## What Changed
```
M	components/discovery/InspectorCard.tsx
M	components/discovery/Omnibox.tsx
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 components/discovery/InspectorCard.tsx |  6 +--
 components/discovery/Omnibox.tsx       | 38 +++++++++++++++-
 lib/state/useDiscoveryStore.ts         | 81 +++++++++++++++++++++++++++++++++-
 3 files changed, 119 insertions(+), 6 deletions(-)
```

## Decisions / Rationale
- Routed Omnibox submits through `/api/places/search` to keep enrichment off the search path; enrichment happens only after a result is selected.
- Preserved direct ingest for URLs/place IDs so the existing “paste link” workflow still works without a result list.
- Gated the InspectorCard on preview state and renamed the action to “Approve Pin” to align with the current non-list flow.

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
- Add a “no results” empty state and loading hint for preview selection.
- Consider separate loading state for search vs preview to refine button copy.
