# Learning Report: feat: add warm-glass light mode tokens and docs contract

- Date: 2026-02-08
- Commit: 4b6acb56574a67c40ec39a51843557f37372b9a3
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add warm-glass light mode tokens and docs contract"

## What Changed
```
M	app/globals.css
M	components/discovery/InspectorCard.tsx
M	components/discovery/Omnibox.tsx
M	components/lists/ListDrawer.tsx
M	components/lists/ListPlanner.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
M	components/ui/ContextPanel.tsx
M	components/ui/OverlayPanel.tsx
M	components/ui/ToolsSheet.tsx
A	docs/LIGHT_MODE_UI_SPEC.md
M	docs/PHASE_2_PLAN.md
M	docs/PHASE_2_UI_UX_REFACTOR_PLAN.md
M	docs/SIGNAL_VISUAL_LANGUAGE.md
M	docs/UX_RULES.md
M	lib/ui/glow.ts
```

## File Stats
```
 app/globals.css                        | 179 ++++++++++++++++++++++++++++++++-
 components/discovery/InspectorCard.tsx |  28 ++++--
 components/discovery/Omnibox.tsx       |  37 +++++--
 components/lists/ListDrawer.tsx        |  50 ++++++---
 components/lists/ListPlanner.tsx       |  40 +++++---
 components/map/MapContainer.tsx        | 126 +++++++++++++----------
 components/places/PlaceDrawer.tsx      | 111 ++++++++++++--------
 components/ui/ContextPanel.tsx         |   4 +
 components/ui/OverlayPanel.tsx         |  24 +++--
 components/ui/ToolsSheet.tsx           |  14 ++-
 docs/LIGHT_MODE_UI_SPEC.md             | 174 ++++++++++++++++++++++++++++++++
 docs/PHASE_2_PLAN.md                   |  10 ++
 docs/PHASE_2_UI_UX_REFACTOR_PLAN.md    |  12 ++-
 docs/SIGNAL_VISUAL_LANGUAGE.md         |  10 +-
 docs/UX_RULES.md                       |  11 ++
 lib/ui/glow.ts                         |   4 +-
 16 files changed, 681 insertions(+), 153 deletions(-)
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
