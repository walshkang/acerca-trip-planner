# Learning Report: feat: transit mode sub-toggles (Slice 4)

- Date: 2026-04-03
- Commit: 81e6a2c1e10895f115c2ce32d2c7b825c01b497d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: transit mode sub-toggles (Slice 4)"

## What Changed
```
M	app/api/user/preferences/route.ts
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	components/paper/PaperHeader.tsx
M	lib/state/useMapLayerStore.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260403000002_add_transit_modes_to_preferences.sql
```

## File Stats
```
 app/api/user/preferences/route.ts                  | 25 +++++-
 components/map/MapShell.tsx                        |  2 +
 components/map/MapView.mapbox.tsx                  |  3 +-
 components/map/MapView.maplibre.tsx                | 30 ++++++-
 components/map/MapView.types.ts                    |  5 ++
 components/paper/PaperHeader.tsx                   | 42 ++++++++++
 lib/state/useMapLayerStore.ts                      | 91 ++++++++++++++++++----
 lib/supabase/types.ts                              |  3 +
 ...0403000002_add_transit_modes_to_preferences.sql |  9 +++
 9 files changed, 193 insertions(+), 17 deletions(-)
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
