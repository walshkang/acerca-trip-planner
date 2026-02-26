# Learning Report: Draft P3-E2 discovery docs

- Date: 2026-02-26
- Commit: e684f3510de1e766b9b79063e8348b27013d6fb1
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Draft P3-E2 discovery docs"

## What Changed
```
M	CONTEXT.md
A	app/api/discovery/suggest/route.ts
A	docs/PHASE_3_DISCOVERY_CONTRACT.md
A	docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md
A	docs/reports/2026-02-26__1a36875__implement-deterministic-routing-api.md
A	lib/discovery/contract.ts
A	lib/server/discovery/suggest.ts
M	lib/server/filters/translate.ts
M	roadmap.json
A	tests/discovery/contract.test.ts
A	tests/discovery/suggest-route.test.ts
```

## File Stats
```
 CONTEXT.md                                         |   8 +-
 app/api/discovery/suggest/route.ts                 |  86 ++++
 docs/PHASE_3_DISCOVERY_CONTRACT.md                 | 134 ++++++
 docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md        |  56 +++
 ...1a36875__implement-deterministic-routing-api.md |  71 +++
 lib/discovery/contract.ts                          | 272 +++++++++++
 lib/server/discovery/suggest.ts                    | 504 +++++++++++++++++++++
 lib/server/filters/translate.ts                    |   6 +-
 roadmap.json                                       |  44 ++
 tests/discovery/contract.test.ts                   |  83 ++++
 tests/discovery/suggest-route.test.ts              | 356 +++++++++++++++
 11 files changed, 1613 insertions(+), 7 deletions(-)
```

## Decisions / Rationale
- Extracted discovery summary generation into a dedicated pure helper (`lib/server/discovery/summary.ts`) so summary logic is structurally isolated from retrieval/ranking logic in `lib/server/discovery/suggest.ts`.
- Added dedicated unit coverage (`tests/discovery/summary.test.ts`) to assert:
  - `include_summary=false` returns `null`,
  - deterministic summary metadata/text shape is stable,
  - ranked suggestions input is not mutated by summary generation.
- Kept the route-level isolation check in `tests/discovery/suggest-route.test.ts` as the integration proof that toggling `include_summary` does not change ranked suggestions.
- Updated discovery contract and verification-gate docs to reflect current implementation state (tasks `2.1-2.4` complete) while explicitly deferring reject/discard cleanup verification to `P3-E2 / 2.6-2.7`.
- Marked `roadmap.json` task `2.4` completed and refreshed `CONTEXT.md` in the same change to prevent status drift.

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
- Implement `P3-E2 / 2.5` map discovery UI integration using the current read-only suggest payload.
- Implement `P3-E2 / 2.6` reject/discard cleanup for preview-created staged artifacts.
- Extend discovery verification automation in `P3-E2 / 2.7` with explicit reject/discard tests and promote those checks from deferred to required gate items.
