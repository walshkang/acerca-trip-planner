# Learning Report: docs: refine phase 2 plan with map-first ux

- Date: 2026-01-29
- Commit: 5d5108d469b790a8cefe3cc0831d6cb4aecafc0b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: refine phase 2 plan with map-first ux"

## What Changed
```
M	docs/PHASE_2_PLAN.md
```

## File Stats
```
 docs/PHASE_2_PLAN.md | 33 ++++++++++++++++++++++++++++-----
 1 file changed, 28 insertions(+), 5 deletions(-)
```

## Decisions / Rationale
- Added map-first refinements to keep the map as the primary interface during Phase 2.
- Chose location bias for Find Place to improve relevance without increasing API calls.

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
- Update roadmap and context to reflect the map-first refinements sequence.
- Implement the list drawer overlay and search bias as the next slice.
