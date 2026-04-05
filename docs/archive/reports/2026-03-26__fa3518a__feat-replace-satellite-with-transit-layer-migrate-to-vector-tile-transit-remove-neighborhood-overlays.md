# Learning Report: feat: replace satellite with transit layer, migrate to vector tile transit, remove neighborhood overlays

- Date: 2026-03-26
- Commit: fa3518a3034649aa45033663c8e9524960361f3b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: replace satellite with transit layer, migrate to vector tile transit, remove neighborhood overlays"

## What Changed
```
M	app/api/user/preferences/route.ts
M	components/app/ExploreShellPaper.tsx
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
D	components/map/useGeoJson.ts
M	components/paper/PaperHeader.tsx
M	components/planner/CalendarPlanner.tsx
A	components/planner/PlannerFreshnessLabel.tsx
A	cursor-prompts/collab-async-sync.md
A	cursor-prompts/transit-subtle-styling.md
A	lib/lists/planner-freshness.ts
M	lib/map/styleResolver.ts
M	lib/state/useMapLayerStore.ts
M	lib/state/useTripStore.ts
A	supabase/migrations/20260326000003_fix_rls_recursion.sql
A	supabase/migrations/20260326000004_update_map_layer_constraint.sql
A	tests/lists/planner-freshness.test.ts
M	tests/map/styleResolver.test.ts
A	tests/state/useTripStore.test.ts
```

## File Stats
```
 app/api/user/preferences/route.ts                  |   2 +-
 components/app/ExploreShellPaper.tsx               |  10 +-
 components/map/MapShell.tsx                        |  57 +--
 components/map/MapView.mapbox.tsx                  | 466 +++++--------------
 components/map/MapView.maplibre.tsx                | 496 +++++----------------
 components/map/MapView.types.ts                    |  40 +-
 components/map/useGeoJson.ts                       |  58 ---
 components/paper/PaperHeader.tsx                   | 134 ++----
 components/planner/CalendarPlanner.tsx             |  36 +-
 components/planner/PlannerFreshnessLabel.tsx       |  27 ++
 cursor-prompts/collab-async-sync.md                | 145 ++++++
 cursor-prompts/transit-subtle-styling.md           | 207 +++++++++
 lib/lists/planner-freshness.ts                     |   7 +
 lib/map/styleResolver.ts                           |  76 ++--
 lib/state/useMapLayerStore.ts                      |   4 +-
 lib/state/useTripStore.ts                          |   7 +
 .../20260326000003_fix_rls_recursion.sql           |  30 ++
 .../20260326000004_update_map_layer_constraint.sql |   7 +
 tests/lists/planner-freshness.test.ts              |  23 +
 tests/map/styleResolver.test.ts                    | 144 +++---
 tests/state/useTripStore.test.ts                   |  40 ++
 21 files changed, 910 insertions(+), 1106 deletions(-)
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
