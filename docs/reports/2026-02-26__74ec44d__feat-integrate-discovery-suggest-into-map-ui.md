# Learning Report: feat: integrate discovery suggest into map UI

- Date: 2026-02-26
- Commit: 74ec44dae52b08f8e7b2bcb2107a2fffa082fa26
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: integrate discovery suggest into map UI"

## What Changed
```
M	CONTEXT.md
M	components/discovery/Omnibox.tsx
M	components/map/MapContainer.tsx
M	docs/PHASE_3_DISCOVERY_CONTRACT.md
M	docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md
A	docs/reports/2026-02-26__p3-e2-2-5__integrate-discovery-suggest-ui.md
A	lib/discovery/client.ts
M	lib/state/useDiscoveryStore.ts
M	roadmap.json
A	tests/discovery/client.test.ts
A	tests/discovery/store.test.ts
```

## File Stats
```
 CONTEXT.md                                         |   6 +-
 components/discovery/Omnibox.tsx                   |  18 ++-
 components/map/MapContainer.tsx                    |  17 ++-
 docs/PHASE_3_DISCOVERY_CONTRACT.md                 |  11 +-
 docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md        |  11 +-
 ...6__p3-e2-2-5__integrate-discovery-suggest-ui.md |  50 ++++++++
 lib/discovery/client.ts                            |  59 +++++++++
 lib/state/useDiscoveryStore.ts                     |  67 +++++++---
 roadmap.json                                       |   2 +-
 tests/discovery/client.test.ts                     | 103 ++++++++++++++++
 tests/discovery/store.test.ts                      | 135 +++++++++++++++++++++
 11 files changed, 446 insertions(+), 33 deletions(-)
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
