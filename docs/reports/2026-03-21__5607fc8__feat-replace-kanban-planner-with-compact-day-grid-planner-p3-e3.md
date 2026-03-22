# Learning Report: feat: replace kanban planner with compact day grid planner (P3-E3)

- Date: 2026-03-21
- Commit: 5607fc8b269c0ab87e0f31ab7de33481abaeae03
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: replace kanban planner with compact day grid planner (P3-E3)"

## What Changed
```
M	app/api/lists/[id]/routing/preview/route.ts
M	app/lists/[id]/page.tsx
M	app/lists/page.tsx
M	app/page.tsx
D	components/lists/ListPlanner.tsx
M	components/map/MapContainer.tsx
A	components/map/MapShell.tsx
R100	components/discovery/InspectorCard.tsx	components/stitch/InspectorCard.tsx
R100	components/lists/ListDetailBody.tsx	components/stitch/ListDetailBody.tsx
R099	components/lists/ListDetailPanel.tsx	components/stitch/ListDetailPanel.tsx
R099	components/lists/ListDrawer.tsx	components/stitch/ListDrawer.tsx
A	components/stitch/ListPlanner.tsx
R100	components/lists/ListsPanel.tsx	components/stitch/ListsPanel.tsx
R100	components/discovery/Omnibox.tsx	components/stitch/Omnibox.tsx
R099	components/places/PlaceDrawer.tsx	components/stitch/PlaceDrawer.tsx
R099	components/places/PlaceListMembershipEditor.tsx	components/stitch/PlaceListMembershipEditor.tsx
R100	components/places/PlaceListTagsEditor.tsx	components/stitch/PlaceListTagsEditor.tsx
R100	components/places/PlaceUserMetaForm.tsx	components/stitch/PlaceUserMetaForm.tsx
A	components/stitch/README.md
A	components/stitch/planner/PlannerBacklog.tsx
A	components/stitch/planner/PlannerDayCell.tsx
A	components/stitch/planner/PlannerDayDetail.tsx
A	components/stitch/planner/PlannerDayGrid.tsx
A	components/stitch/planner/PlannerMovePicker.tsx
A	components/stitch/planner/PlannerTripDates.tsx
A	components/stitch/planner/planner-utils.ts
A	components/workspace/WorkspaceContainer.tsx
A	docs/reports/2026-02-28__482197e__feat-adaptive-workspace-resizable-desktop-panel-mobile-sheet-snap-points-p4-e1-tasks-1-1-1-2.md
A	docs/reports/2026-02-28__7a7fffd__test-add-e2e-coverage-for-adaptive-workspace-p4-e1-tasks-1-1-1-2.md
A	docs/reports/2026-03-21__91f42f1__docs-comprehensive-ui-ux-design-system-and-planner-revamp-spec.md
A	docs/reports/2026-03-21__9cb2075__docs-comprehensive-ui-ux-design-system-and-planner-revamp-spec.md
M	lib/export/contract.ts
M	lib/server/discovery/suggest.ts
M	lib/server/discovery/summary.ts
M	tests/e2e/list-planner-move.spec.ts
```

## File Stats
```
 app/api/lists/[id]/routing/preview/route.ts        |    2 +-
 app/lists/[id]/page.tsx                            |    2 +-
 app/lists/page.tsx                                 |    2 +-
 app/page.tsx                                       |   17 +-
 components/lists/ListPlanner.tsx                   | 1388 ------------------
 components/map/MapContainer.tsx                    | 1540 +-------------------
 components/map/MapShell.tsx                        |  768 ++++++++++
 components/{discovery => stitch}/InspectorCard.tsx |    0
 components/{lists => stitch}/ListDetailBody.tsx    |    0
 components/{lists => stitch}/ListDetailPanel.tsx   |    2 +-
 components/{lists => stitch}/ListDrawer.tsx        |    2 +-
 components/stitch/ListPlanner.tsx                  |  814 +++++++++++
 components/{lists => stitch}/ListsPanel.tsx        |    0
 components/{discovery => stitch}/Omnibox.tsx       |    0
 components/{places => stitch}/PlaceDrawer.tsx      |    4 +-
 .../PlaceListMembershipEditor.tsx                  |    1 +
 .../{places => stitch}/PlaceListTagsEditor.tsx     |    0
 .../{places => stitch}/PlaceUserMetaForm.tsx       |    0
 components/stitch/README.md                        |    5 +
 components/stitch/planner/PlannerBacklog.tsx       |  119 ++
 components/stitch/planner/PlannerDayCell.tsx       |  124 ++
 components/stitch/planner/PlannerDayDetail.tsx     |  168 +++
 components/stitch/planner/PlannerDayGrid.tsx       |   69 +
 components/stitch/planner/PlannerMovePicker.tsx    |  118 ++
 components/stitch/planner/PlannerTripDates.tsx     |  154 ++
 components/stitch/planner/planner-utils.ts         |   50 +
 components/workspace/WorkspaceContainer.tsx        |  953 ++++++++++++
 ...mobile-sheet-snap-points-p4-e1-tasks-1-1-1-2.md |   49 +
 ...e-for-adaptive-workspace-p4-e1-tasks-1-1-1-2.md |   49 +
 ...-ui-ux-design-system-and-planner-revamp-spec.md |   59 +
 ...-ui-ux-design-system-and-planner-revamp-spec.md |   59 +
 lib/export/contract.ts                             |    2 +-
 lib/server/discovery/suggest.ts                    |   12 +-
 lib/server/discovery/summary.ts                    |    2 +-
 tests/e2e/list-planner-move.spec.ts                |  341 +++--
 35 files changed, 3816 insertions(+), 3059 deletions(-)
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
