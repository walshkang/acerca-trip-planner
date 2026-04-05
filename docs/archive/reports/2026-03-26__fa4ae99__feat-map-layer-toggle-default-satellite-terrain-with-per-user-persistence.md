# Learning Report: feat: map layer toggle (default/satellite/terrain) with per-user persistence

- Date: 2026-03-26
- Commit: fa4ae99efb6f8141a0702cbf5d8f2a63bff4abef
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: map layer toggle (default/satellite/terrain) with per-user persistence"

## What Changed
```
A	app/api/user/preferences/route.ts
M	components/app/AppShell.tsx
M	components/app/ExploreShellPaper.tsx
M	components/app/PlannerShellPaper.tsx
M	components/map/MapInset.tsx
M	components/map/MapShell.tsx
M	components/paper/PaperHeader.tsx
A	cursor-prompts/map-layer-persistence.md
A	cursor-prompts/map-layer-toggle.md
A	docs/COLLAB_SLICES.md
A	docs/MAP_LAYER_SLICES.md
M	lib/map/styleResolver.ts
A	lib/state/useMapLayerStore.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260326000001_create_user_preferences.sql
M	tests/map/styleResolver.test.ts
```

## File Stats
```
 app/api/user/preferences/route.ts                  |  73 ++++++++
 components/app/AppShell.tsx                        |   7 +
 components/app/ExploreShellPaper.tsx               |   4 +
 components/app/PlannerShellPaper.tsx               |   4 +
 components/map/MapInset.tsx                        |   5 +-
 components/map/MapShell.tsx                        |   5 +-
 components/paper/PaperHeader.tsx                   | 116 +++++++++---
 cursor-prompts/map-layer-persistence.md            | 159 ++++++++++++++++
 cursor-prompts/map-layer-toggle.md                 | 205 +++++++++++++++++++++
 docs/COLLAB_SLICES.md                              | 166 +++++++++++++++++
 docs/MAP_LAYER_SLICES.md                           |  80 ++++++++
 lib/map/styleResolver.ts                           |  84 +++++++--
 lib/state/useMapLayerStore.ts                      |  85 +++++++++
 lib/supabase/types.ts                              |  24 +++
 .../20260326000001_create_user_preferences.sql     |  31 ++++
 tests/map/styleResolver.test.ts                    |  93 +++++++++-
 16 files changed, 1091 insertions(+), 50 deletions(-)
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
