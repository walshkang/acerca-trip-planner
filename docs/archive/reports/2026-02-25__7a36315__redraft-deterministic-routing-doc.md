# Learning Report: Redraft deterministic routing doc

- Date: 2026-02-25
- Commit: 7a36315bbe6c4ec83b6e076020e870cab6ef0006
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Redraft deterministic routing doc"

## What Changed
```
M	CONTEXT.md
A	app/api/lists/[id]/routing/preview/route.ts
M	docs/LIGHT_MODE_UI_SPEC.md
M	docs/PHASE_2_PLAN.md
A	docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md
A	docs/PHASE_3_ROUTING_CONTRACT.md
A	lib/routing/contract.ts
A	lib/routing/provider.ts
A	lib/routing/sequence.ts
M	roadmap.json
A	tests/routing/contract.test.ts
A	tests/routing/list-routing-preview-route.test.ts
A	tests/routing/provider.test.ts
```

## File Stats
```
 CONTEXT.md                                       |  20 +-
 app/api/lists/[id]/routing/preview/route.ts      | 392 ++++++++++++
 docs/LIGHT_MODE_UI_SPEC.md                       |   2 +-
 docs/PHASE_2_PLAN.md                             |   4 +-
 docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md         |  56 ++
 docs/PHASE_3_ROUTING_CONTRACT.md                 | 119 ++++
 lib/routing/contract.ts                          | 195 ++++++
 lib/routing/provider.ts                          |  87 +++
 lib/routing/sequence.ts                          | 135 ++++
 roadmap.json                                     |  51 +-
 tests/routing/contract.test.ts                   |  65 ++
 tests/routing/list-routing-preview-route.test.ts | 782 +++++++++++++++++++++++
 tests/routing/provider.test.ts                   |  61 ++
 13 files changed, 1954 insertions(+), 15 deletions(-)
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
