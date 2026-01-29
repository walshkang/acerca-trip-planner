# Learning Report: docs: align phase 2 plan with search/tag fixes

- Date: 2026-01-29
- Commit: 77c5c1bccdc08d576560ee232ac10013a69f540f
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: align phase 2 plan with search/tag fixes"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md           |  4 ++--
 docs/PHASE_2_PLAN.md | 10 +++++++---
 roadmap.json         |  9 ++++++---
 3 files changed, 15 insertions(+), 8 deletions(-)
```

## Decisions / Rationale
- Clarified the next P2-E3/P2-E4 slice to encode the contracts behind the recent testing notes (keyword-only local search, single tag chip set with clear-all persistence, map camera stability, and overlay layering).
- Removed the Wikipedia gating item from the forward-looking plan because it is already implemented; this keeps the roadmap focused on remaining work.
- Added sign-out placement to the map shell plan so UX gaps from testing are tracked in scope.

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
- Implement the local-search contract fix and update list search UI to match the response shape.
- Ship tag chip UX with per-chip remove + clear-all that persists empty tags, plus invalidate list items on update.
- Guard map camera changes on empty list selection, ensure dropdowns render above drawers, and add a sign-out affordance.
- Verify with the manual QA checklist from the testing notes.
