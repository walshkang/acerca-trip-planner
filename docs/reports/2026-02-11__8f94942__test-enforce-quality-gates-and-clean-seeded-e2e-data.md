# Learning Report: test: enforce quality gates and clean seeded e2e data

- Date: 2026-02-11
- Commit: 8f9494253b13599f6b01c7a4551e7f871b6fadce
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: enforce quality gates and clean seeded e2e data"

## What Changed
```
M	.github/pull_request_template.md
A	.github/workflows/playwright-seeded.yml
M	.github/workflows/validate-json.yml
M	CONTEXT.md
M	app/api/test/seed/route.ts
M	docs/PLAYWRIGHT.md
M	docs/QUALITY_GATES.md
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
M	tests/e2e/seeded-helpers.ts
A	tests/lists/list-item-schedule-patch-route.test.ts
```

## File Stats
```
 .github/pull_request_template.md                   |   3 +
 .github/workflows/playwright-seeded.yml            |  84 +++++
 .github/workflows/validate-json.yml                |  20 +-
 CONTEXT.md                                         |   2 +-
 app/api/test/seed/route.ts                         |  93 ++++++
 docs/PLAYWRIGHT.md                                 |  16 +
 docs/QUALITY_GATES.md                              |  20 +-
 tests/e2e/list-filters-and-map-link.spec.ts        | 137 ++++----
 tests/e2e/list-local-search.spec.ts                |  53 ++--
 tests/e2e/list-planner-move.spec.ts                | 118 +++----
 tests/e2e/map-place-drawer.spec.ts                 | 237 +++++++-------
 tests/e2e/seeded-helpers.ts                        |  42 +++
 tests/lists/list-item-schedule-patch-route.test.ts | 343 +++++++++++++++++++++
 13 files changed, 917 insertions(+), 251 deletions(-)
```

## Decisions / Rationale
- Added a deterministic gate split: `npm run check` + `npm test` are now always-on CI baselines, while seeded Playwright remains policy-required for high-risk planner/list/map-link changes.
- Introduced a manual seeded Playwright workflow (`workflow_dispatch`) so CI can run E2E when secrets/auth storage are available without blocking every PR.
- Added route-contract tests for `PATCH /api/lists/[id]/items/[itemId]` to lock down schedule field coupling and error mapping at the API seam where regressions are costly.
- Added guarded seeded data cleanup (`DELETE /api/test/seed`) and `finally` cleanup in seeded specs so running E2E with a real account does not accumulate noisy test lists/places.
- Tradeoff: cleanup depends on test process reaching `finally`; abrupt process termination can still leave residual seeded rows.

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
- Monitor one full local + manual CI seeded run to confirm cleanup executes reliably across retries and failures.
- Add desktop DnD scheduling/reorder seeded E2E coverage to close the remaining planner persistence gap in Phase 2.
- If residual seeded rows become common, add a targeted maintenance cleanup command for stale `Playwright Smoke` data by age.
