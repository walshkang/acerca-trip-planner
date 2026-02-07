# Learning Report: test(e2e): fix Playwright auth + deterministic seed

- Date: 2026-02-06
- Commit: aec78a62f5a31cdb91d7969d54a2975483043631
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test(e2e): fix Playwright auth + deterministic seed"

## What Changed
```
A	app/api/test/seed/route.ts
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/ui/ContextPanel.tsx
M	docs/PLAYWRIGHT.md
M	lib/server/enrichment/normalize.ts
A	lib/server/testSeed.ts
M	playwright.config.ts
A	playwright/global-setup.ts
A	scripts/ensure-playwright-seed-user.mjs
A	scripts/ensure-playwright-seed-user.ts
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 app/api/test/seed/route.ts                  | 105 ++++++++++++++++++
 components/map/MapView.mapbox.tsx           |  91 +++++++++------
 components/map/MapView.maplibre.tsx         | 103 ++++++++++-------
 components/ui/ContextPanel.tsx              |  10 +-
 docs/PLAYWRIGHT.md                          |  39 ++++---
 lib/server/enrichment/normalize.ts          |   6 +-
 lib/server/testSeed.ts                      |  83 ++++++++++++++
 playwright.config.ts                        |   1 +
 playwright/global-setup.ts                  | 127 +++++++++++++++++++++
 scripts/ensure-playwright-seed-user.mjs     | 158 ++++++++++++++++++++++++++
 scripts/ensure-playwright-seed-user.ts      | 166 ++++++++++++++++++++++++++++
 tests/e2e/list-filters-and-map-link.spec.ts |  19 +++-
 tests/e2e/list-local-search.spec.ts         |  11 +-
 tests/e2e/map-place-drawer.spec.ts          |  56 ++++++++--
 14 files changed, 863 insertions(+), 112 deletions(-)
```

## Decisions / Rationale
- Unblocked E2E auth by switching to a deterministic email/password seed user flow (no magic-link email dependency) and writing Playwright storage state in `globalSetup` via Supabase SSR cookie adapters.
- Added a guarded `/api/test/seed` route so specs can create fresh lists/places on-demand without relying on existing DB state; the route is disabled in production and requires an `x-seed-token` header.
- Made test seeding deterministic and non-LLM by forcing deterministic enrichment normalization for seed candidates (avoids OpenAI calls + reduces data churn).
- Stabilized marker interaction during E2E by ensuring list-driven state is loaded before clicking, closing the list drawer before map interactions, and giving active/focused markers a higher `z-index` so they win hit-testing when markers overlap.

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
- Optional: add a `/api/test/cleanup` (token-guarded, non-prod) to delete old Playwright seed lists for the seed user to keep the DB tidy.
- Ensure CI (or local env) provides the required Playwright + Supabase env vars so `globalSetup` and `/api/test/seed` work out of the box.
