# Learning Report: feat: add context panel and tools sheet

- Date: 2026-02-06
- Commit: 7a65a042ecaa475142fae34e27d4b829972d7bb7
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add context panel and tools sheet"

## What Changed
```
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
A	components/ui/ContextPanel.tsx
A	components/ui/OverlayPanel.tsx
A	components/ui/ToolsSheet.tsx
A	components/ui/useMediaQuery.ts
A	docs/PHASE_2_UI_UX_REFACTOR_PLAN.md
```

## File Stats
```
 components/lists/ListDetailBody.tsx |   2 +-
 components/lists/ListDrawer.tsx     |  42 ++--
 components/map/MapContainer.tsx     | 425 ++++++++++++++++++++++++------------
 components/places/PlaceDrawer.tsx   |  13 +-
 components/ui/ContextPanel.tsx      |  59 +++++
 components/ui/OverlayPanel.tsx      |  54 +++++
 components/ui/ToolsSheet.tsx        |  36 +++
 components/ui/useMediaQuery.ts      |  19 ++
 docs/PHASE_2_UI_UX_REFACTOR_PLAN.md | 104 +++++++++
 9 files changed, 595 insertions(+), 159 deletions(-)
```

## Decisions / Rationale
- Implemented the Phase 2 “surface model” to prevent floating window sprawl as we go mobile-first: Map stays primary, with one **Context Panel** (lists/place context) and one **Tools Sheet** (layers/base-map/account).
- Moved preview/approve (Inspector) into the Context Panel’s place context to remove the prior layout coupling (measuring the right overlay height to position the place drawer).
- Added a dedicated plan doc (`docs/PHASE_2_UI_UX_REFACTOR_PLAN.md`) to make the refactor contract explicit (URL state, overlay budget, mobile-first rules).
- Tradeoff: this is a composition refactor with some duplicated rendering (mobile vs desktop panel content) and `?list=` URL syncing is partial (list selection pushes `?list`, but we still allow localStorage fallback when absent).

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
- Add the `?list=` contract reconciliation (deep link selection + history semantics) and decide whether to ever auto-write list selection into the URL (or keep URL optional when sourced from localStorage).
- Reduce duplication between mobile/desktop render paths in `components/map/MapContainer.tsx` (extract shared “list pane” and “place pane” render functions).
- Manual QA on mobile Safari: bottom-sheet sizing (`dvh`), keyboard interactions, and overlay mutual exclusion (Tools vs Context).
