# Learning Report: feat: canonical GTFS mode normalization (v2 cache)

- Date: 2026-04-03
- Commit: daafb373c82f5d93b3cdfa44aa4e9e5f3b6f6a9f
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: canonical GTFS mode normalization (v2 cache)"

## What Changed
```
M	app/api/transit/routes/route.ts
M	app/api/user/preferences/route.ts
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	docs/context.md
M	lib/state/useMapLayerStore.ts
M	lib/transit/metroArea.ts
A	supabase/migrations/20260404000001_transit_modes_allow_ferry.sql
A	tests/transit/metroArea.test.ts
```

## File Stats
```
 app/api/transit/routes/route.ts                    | 66 ++++++++++++----------
 app/api/user/preferences/route.ts                  |  2 +-
 components/map/MapView.maplibre.tsx                | 35 +++++++-----
 components/map/MapView.types.ts                    |  4 +-
 docs/context.md                                    |  2 +-
 lib/state/useMapLayerStore.ts                      |  4 +-
 lib/transit/metroArea.ts                           | 52 +++++++++++++++++
 .../20260404000001_transit_modes_allow_ferry.sql   |  5 ++
 tests/transit/metroArea.test.ts                    | 46 +++++++++++++++
 9 files changed, 167 insertions(+), 49 deletions(-)
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
