# Learning Report: test: restore seeded playwright suite and stabilize list patch fallback

- Date: 2026-02-11
- Commit: 5f1a0347587166846385a88824fa693137ea97dc
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: restore seeded playwright suite and stabilize list patch fallback"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/route.ts
A	app/api/test/seed/route.ts
M	docs/PLAYWRIGHT.md
M	docs/QUALITY_GATES.md
A	lib/server/testSeed.ts
M	roadmap.json
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
A	tests/e2e/seeded-helpers.ts
M	tests/lists/list-trip-patch-route.test.ts
```

## File Stats
```
 CONTEXT.md                                  |  32 +++--
 app/api/lists/[id]/route.ts                 | 196 +++++++++++++++++++++++++++-
 app/api/test/seed/route.ts                  | 115 ++++++++++++++++
 docs/PLAYWRIGHT.md                          |  39 ++++--
 docs/QUALITY_GATES.md                       |  12 +-
 lib/server/testSeed.ts                      |  66 ++++++++++
 roadmap.json                                |  10 +-
 tests/e2e/list-filters-and-map-link.spec.ts | 169 +++++++-----------------
 tests/e2e/list-local-search.spec.ts         |  61 ++-------
 tests/e2e/list-planner-move.spec.ts         |  96 +++++++-------
 tests/e2e/map-place-drawer.spec.ts          |  83 +++---------
 tests/e2e/seeded-helpers.ts                 | 126 ++++++++++++++++++
 tests/lists/list-trip-patch-route.test.ts   |  79 +++++++++++
 13 files changed, 763 insertions(+), 321 deletions(-)
```

## Decisions / Rationale
- Restored seeded E2E through a guarded server route (`/api/test/seed`) plus shared server utility so we can validate map/list planner regressions with deterministic fixtures without exposing non-prod test helpers in normal runtime.
- Replaced brittle E2E setup duplication with a shared helper module (`tests/e2e/seeded-helpers.ts`) to standardize env skip guards, API auth probing, seed calls, and visible test-id locators; this reduces drift across seeded specs.
- Hardened `PATCH /api/lists/[id]` by adding a fallback update path when RPC date patching fails with Postgres ambiguous-column errors (`42702`), preserving date-range validation and backlog reset behavior instead of failing user updates.
- Updated docs/gates to reflect restored seeded coverage as active for planner/list/map-link behaviors, while keeping unit/API checks as baseline for areas not yet covered by seeded E2E.

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
- Add seeded E2E coverage for desktop planner drag-and-drop reorder persistence to close the remaining P2-E1 follow-up gap.
- Introduce a deterministic seeded-data cleanup/reset step for local E2E runs to reduce long-term marker-density flakiness from accumulated test fixtures.
- Consider moving flaky map marker interactions to explicit map/list deep-link entry points where feasible while retaining at least one direct marker-open assertion path.
