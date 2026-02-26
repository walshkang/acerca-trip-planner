# Learning Report: Implement deterministic routing API

- Date: 2026-02-26
- Commit: 1a36875baa78fec4a422fc7a7a5b082d88451dcf
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Implement deterministic routing API"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/routing/preview/route.ts
M	docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md
M	docs/PHASE_3_ROUTING_CONTRACT.md
A	docs/PHASE_3_ROUTING_VERIFICATION_GATE.md
M	docs/QUALITY_GATES.md
A	docs/reports/2026-02-26__670a893__summarize-plan-critique.md
M	lib/routing/contract.ts
A	lib/routing/provider-leg-metrics.ts
M	roadmap.json
M	tests/routing/contract.test.ts
M	tests/routing/list-routing-preview-route.test.ts
A	tests/routing/provider-leg-metrics.test.ts
```

## File Stats
```
 CONTEXT.md                                         |  12 +-
 app/api/lists/[id]/routing/preview/route.ts        | 160 ++---------------
 docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md           |  25 ++-
 docs/PHASE_3_ROUTING_CONTRACT.md                   |  30 +++-
 docs/PHASE_3_ROUTING_VERIFICATION_GATE.md          |  46 +++++
 docs/QUALITY_GATES.md                              |   2 +
 ...2026-02-26__670a893__summarize-plan-critique.md |  61 +++++++
 lib/routing/contract.ts                            |   1 +
 lib/routing/provider-leg-metrics.ts                | 154 +++++++++++++++++
 roadmap.json                                       |   4 +-
 tests/routing/contract.test.ts                     |  15 +-
 tests/routing/list-routing-preview-route.test.ts   | 123 +++++++++++--
 tests/routing/provider-leg-metrics.test.ts         | 192 +++++++++++++++++++++
 13 files changed, 638 insertions(+), 187 deletions(-)
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
