# Learning Report: feat: tighten map focus state and add active-list removal

- Date: 2026-02-09
- Commit: e75d19109209992cda46148520e9e989e51e4ced
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: tighten map focus state and add active-list removal"

## What Changed
```
M	CONTEXT.md
M	components/lists/ListDrawer.tsx
M	components/lists/ListPlanner.tsx
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	components/places/PlaceDrawer.tsx
M	docs/PLAYWRIGHT.md
A	mockup.json
M	roadmap.json
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 CONTEXT.md                                  | 72 +++++-------------------
 components/lists/ListDrawer.tsx             | 27 ++++++++-
 components/lists/ListPlanner.tsx            | 12 +++-
 components/map/MapContainer.tsx             | 68 ++++++++++++++++-------
 components/map/MapView.mapbox.tsx           | 28 +++++++---
 components/map/MapView.maplibre.tsx         | 28 +++++++---
 components/map/MapView.types.ts             |  3 +
 components/places/PlaceDrawer.tsx           | 56 ++++++++++++++++++-
 docs/PLAYWRIGHT.md                          |  5 ++
 mockup.json                                 | 46 +++++++++++++++
 roadmap.json                                | 86 ++++++++++++++++++++++++++++-
 tests/e2e/list-filters-and-map-link.spec.ts |  2 +
 tests/e2e/list-local-search.spec.ts         |  2 +
 tests/e2e/list-planner-move.spec.ts         |  3 +-
 tests/e2e/map-place-drawer.spec.ts          |  2 +
 15 files changed, 332 insertions(+), 108 deletions(-)
```

## Decisions / Rationale
- TODO: Add why these changes were made and any tradeoffs.

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
- TODO: List follow-ups or risks.
