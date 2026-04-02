# Learning Report: feat: UI polish (slot tokens, map pins, day detail) + transit lines shape

- Date: 2026-04-02
- Commit: dd05055198e7d6b525ab8f8e4b00c749056a7884
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: UI polish (slot tokens, map pins, day detail) + transit lines shape"

## What Changed
```
M	components/app/ExploreShellPaper.tsx
M	components/map/MapInset.tsx
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
A	components/map/placeMarkerRing.ts
M	components/paper/PaperExplorePanel.tsx
M	components/planner/Calendar2WeekGrid.tsx
M	components/planner/Calendar3DayGrid.tsx
M	components/planner/CalendarAgendaView.tsx
M	components/planner/CalendarDayDetail.tsx
M	components/planner/CalendarPlanner.tsx
M	components/planner/CalendarWeekGrid.tsx
M	components/planner/DayCell.tsx
M	components/stitch/ListPlanner.tsx
M	components/stitch/planner/PlannerTripDates.tsx
M	components/stitch/planner/planner-utils.ts
A	docs/TRANSIT_LINES_SHAPE.md
R100	docs/COLLAB_SLICES.md	docs/archive/COLLAB_SLICES.md
R100	docs/LIGHT_MODE_UI_SPEC.md	docs/archive/LIGHT_MODE_UI_SPEC.md
R100	docs/MAP_LAYER_SLICES.md	docs/archive/MAP_LAYER_SLICES.md
R100	docs/PHASE_2_KANBAN_SPEC.md	docs/archive/PHASE_2_KANBAN_SPEC.md
R100	docs/PHASE_2_PLAN.md	docs/archive/PHASE_2_PLAN.md
R100	docs/PHASE_3_DISCOVERY_CONTRACT.md	docs/archive/PHASE_3_DISCOVERY_CONTRACT.md
R100	docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md	docs/archive/PHASE_3_DISCOVERY_VERIFICATION_GATE.md
R100	docs/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md	docs/archive/PHASE_3_ROUTING_ADAPTER_BOUNDARY.md
R100	docs/PHASE_3_ROUTING_CONTRACT.md	docs/archive/PHASE_3_ROUTING_CONTRACT.md
R100	docs/PHASE_3_ROUTING_VERIFICATION_GATE.md	docs/archive/PHASE_3_ROUTING_VERIFICATION_GATE.md
R100	docs/PLAN_PAGE_SLICES.md	docs/archive/PLAN_PAGE_SLICES.md
A	docs/context.md
A	lib/dates/local-calendar.ts
A	lib/slots.ts
```

## File Stats
```
 components/app/ExploreShellPaper.tsx               |  28 ++-
 components/map/MapInset.tsx                        |  13 +-
 components/map/MapShell.tsx                        |   8 +
 components/map/MapView.mapbox.tsx                  |  13 +-
 components/map/MapView.maplibre.tsx                |  13 +-
 components/map/MapView.types.ts                    |   2 +
 components/map/placeMarkerRing.ts                  |  40 ++++
 components/paper/PaperExplorePanel.tsx             |   8 +-
 components/planner/Calendar2WeekGrid.tsx           |   6 +-
 components/planner/Calendar3DayGrid.tsx            |   6 +-
 components/planner/CalendarAgendaView.tsx          |  11 +-
 components/planner/CalendarDayDetail.tsx           |  24 ++-
 components/planner/CalendarPlanner.tsx             |  14 +-
 components/planner/CalendarWeekGrid.tsx            |   6 +-
 components/planner/DayCell.tsx                     |  22 +-
 components/stitch/ListPlanner.tsx                  |  12 +-
 components/stitch/planner/PlannerTripDates.tsx     |  17 +-
 components/stitch/planner/planner-utils.ts         |  11 +-
 docs/TRANSIT_LINES_SHAPE.md                        | 236 +++++++++++++++++++++
 docs/{ => archive}/COLLAB_SLICES.md                |   0
 docs/{ => archive}/LIGHT_MODE_UI_SPEC.md           |   0
 docs/{ => archive}/MAP_LAYER_SLICES.md             |   0
 docs/{ => archive}/PHASE_2_KANBAN_SPEC.md          |   0
 docs/{ => archive}/PHASE_2_PLAN.md                 |   0
 docs/{ => archive}/PHASE_3_DISCOVERY_CONTRACT.md   |   0
 .../PHASE_3_DISCOVERY_VERIFICATION_GATE.md         |   0
 .../PHASE_3_ROUTING_ADAPTER_BOUNDARY.md            |   0
 docs/{ => archive}/PHASE_3_ROUTING_CONTRACT.md     |   0
 .../PHASE_3_ROUTING_VERIFICATION_GATE.md           |   0
 docs/{ => archive}/PLAN_PAGE_SLICES.md             |   0
 docs/context.md                                    |  64 ++++++
 lib/dates/local-calendar.ts                        |   8 +
 lib/slots.ts                                       |  80 +++++++
 33 files changed, 561 insertions(+), 81 deletions(-)
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
