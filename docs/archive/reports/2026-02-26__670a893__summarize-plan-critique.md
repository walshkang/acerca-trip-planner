# Learning Report: Summarize plan critique

- Date: 2026-02-26
- Commit: 670a893c7b2be4a0ebaaa7c8b396514820ebe344
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Summarize plan critique"

## What Changed
```
M	app/api/lists/[id]/routing/preview/route.ts
M	docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md
M	docs/PHASE_3_ROUTING_CONTRACT.md
A	docs/reports/2026-02-25__7a36315__redraft-deterministic-routing-doc.md
M	lib/routing/contract.ts
M	lib/routing/provider.ts
M	tests/routing/list-routing-preview-route.test.ts
M	tests/routing/provider.test.ts
```

## File Stats
```
 app/api/lists/[id]/routing/preview/route.ts        | 243 +++++++++++-
 docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md           |  26 +-
 docs/PHASE_3_ROUTING_CONTRACT.md                   |  75 +++-
 ...__7a36315__redraft-deterministic-routing-doc.md |  71 ++++
 lib/routing/contract.ts                            |  29 ++
 lib/routing/provider.ts                            |  16 +-
 tests/routing/list-routing-preview-route.test.ts   | 425 +++++++++++++++++++++
 tests/routing/provider.test.ts                     |  26 ++
 8 files changed, 886 insertions(+), 25 deletions(-)
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
