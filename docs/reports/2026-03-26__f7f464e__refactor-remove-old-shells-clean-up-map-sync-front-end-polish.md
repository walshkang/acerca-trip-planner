# Learning Report: refactor: remove old shells, clean up map sync, front-end polish

- Date: 2026-03-26
- Commit: f7f464e8f54f5cd5b7d784c0438abe89ea74e2ef
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "refactor: remove old shells, clean up map sync, front-end polish"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
M	README.md
M	app/globals.css
D	components/app/ExploreShell.tsx
M	components/app/ExploreShellPaper.tsx
D	components/app/NavFooter.tsx
D	components/app/NavRail.tsx
D	components/app/PlannerShell.tsx
M	components/app/PlannerShellPaper.tsx
D	components/map/MapContainer.tsx
M	components/map/MapInset.tsx
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/paper/PaperExplorePanel.tsx
M	components/paper/PaperHeader.tsx
M	components/planner/CalendarPlanner.tsx
M	components/planner/DayCell.tsx
M	components/stitch/ListDetailPanel.tsx
D	components/ui/ContextPanel.tsx
D	components/workspace/WorkspaceContainer.tsx
M	docs/QUALITY_GATES.md
M	lib/ui/glow.ts
A	lib/ui/mobileSnapState.ts
M	tailwind.config.ts
```

## File Stats
```
 AGENTS.md                                   |   2 +-
 CONTEXT.md                                  |  29 +-
 README.md                                   |   2 +-
 app/globals.css                             |   4 +-
 components/app/ExploreShell.tsx             | 900 ----------------------------
 components/app/ExploreShellPaper.tsx        |   2 +-
 components/app/NavFooter.tsx                |  84 ---
 components/app/NavRail.tsx                  |  84 ---
 components/app/PlannerShell.tsx             | 163 -----
 components/app/PlannerShellPaper.tsx        |  16 +-
 components/map/MapContainer.tsx             |   7 -
 components/map/MapInset.tsx                 |  50 +-
 components/map/MapShell.tsx                 |   7 +-
 components/map/MapView.mapbox.tsx           |  15 +-
 components/map/MapView.maplibre.tsx         |  15 +-
 components/paper/PaperExplorePanel.tsx      |   2 +-
 components/paper/PaperHeader.tsx            |  29 +
 components/planner/CalendarPlanner.tsx      |   4 +-
 components/planner/DayCell.tsx              |   7 +-
 components/stitch/ListDetailPanel.tsx       |   5 +-
 components/ui/ContextPanel.tsx              | 324 ----------
 components/workspace/WorkspaceContainer.tsx |   7 -
 docs/QUALITY_GATES.md                       |   4 +-
 lib/ui/glow.ts                              |  17 +
 lib/ui/mobileSnapState.ts                   |   2 +
 tailwind.config.ts                          |  28 +
 26 files changed, 193 insertions(+), 1616 deletions(-)
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
