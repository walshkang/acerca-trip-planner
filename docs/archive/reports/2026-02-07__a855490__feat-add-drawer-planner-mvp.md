# Learning Report: feat: add drawer planner MVP

- Date: 2026-02-07
- Commit: a855490765caa0353104275f953ee26a52579fde
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add drawer planner MVP"

## What Changed
```
A	app/api/lists/[id]/items/[itemId]/route.ts
M	app/api/lists/[id]/items/route.ts
M	app/api/lists/[id]/route.ts
M	components/discovery/InspectorCard.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDrawer.tsx
A	components/lists/ListPlanner.tsx
M	components/map/MapContainer.tsx
M	components/ui/ContextPanel.tsx
M	lib/icons/mapping.ts
A	lib/lists/planner.ts
M	lib/server/enrichment/normalize.ts
M	lib/supabase/types.ts
M	lib/types/enums.ts
A	public/icons/drinks.svg
A	supabase/migrations/20260207000001_add_drinks_category.sql
A	tests/e2e/list-planner-move.spec.ts
A	tests/lists/planner.test.ts
M	tests/schema/icons.test.ts
```

## File Stats
```
 app/api/lists/[id]/items/[itemId]/route.ts         | 222 +++++
 app/api/lists/[id]/items/route.ts                  |   2 +
 app/api/lists/[id]/route.ts                        | 192 ++++
 components/discovery/InspectorCard.tsx             |   3 -
 components/lists/ListDetailBody.tsx                |   7 +-
 components/lists/ListDrawer.tsx                    |   6 -
 components/lists/ListPlanner.tsx                   | 978 +++++++++++++++++++++
 components/map/MapContainer.tsx                    | 102 ++-
 components/ui/ContextPanel.tsx                     |   2 +-
 lib/icons/mapping.ts                               |   2 +
 lib/lists/planner.ts                               |  99 +++
 lib/server/enrichment/normalize.ts                 |  10 +-
 lib/supabase/types.ts                              |   4 +-
 lib/types/enums.ts                                 |   1 +
 public/icons/drinks.svg                            |   4 +
 .../20260207000001_add_drinks_category.sql         |   3 +
 tests/e2e/list-planner-move.spec.ts                | 121 +++
 tests/lists/planner.test.ts                        |  68 ++
 tests/schema/icons.test.ts                         |   9 +-
 19 files changed, 1804 insertions(+), 31 deletions(-)
```

## Decisions / Rationale
- Added a `Plan` mode inside the map drawer (ContextPanel) so users can schedule while staying anchored to map pins (pins remain the source of truth).
- Implemented writes via server routes (no privileged client writes) to keep validation and audit fields server-side.
- Represented schedule slots as sentinel times (Morning/Afternoon/Evening) to keep the UI fast and the DB model deterministic without introducing a new slot enum column yet.
- Added a render cap for long trips (only render a limited number of days, otherwise show only days with scheduled items) to avoid the freeze seen when rendering many day buckets.
- Extended strict taxonomy with `Drinks` (and icon mapping/tests) so bar-like places classify deterministically and match UI icon sets exactly.

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
- Decide whether to fully deprecate `/lists` pages (redirect to map + drawer) and migrate any remaining list-management actions into the drawer.
- Update any E2E tests that navigate to `/lists/...` to use the drawer-first planner flows.
- Revisit long-trip UX (virtualized day list or progressive disclosure) if we want to show all empty days without performance regressions.
- Validate timezone + DST edge cases for trip dates and slot sentinel times in real browsers/environments.
