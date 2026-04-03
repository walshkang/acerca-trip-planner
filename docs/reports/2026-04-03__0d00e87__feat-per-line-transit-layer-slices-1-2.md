# Learning Report: feat: per-line transit layer (Slices 1–2)

- Date: 2026-04-03
- Commit: 0d00e878111f5901ae3a0e8c5531589be2a2c370
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: per-line transit layer (Slices 1–2)"

## What Changed
```
A	app/api/transit/routes/route.ts
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
A	lib/transit/metroArea.ts
A	lib/transit/useGtfsLayer.ts
A	supabase/migrations/20260403000001_create_transit_cache_bucket.sql
```

## File Stats
```
 app/api/transit/routes/route.ts                    | 165 +++++++++++++++++++++
 components/map/MapShell.tsx                        |   5 +
 components/map/MapView.mapbox.tsx                  |   2 +
 components/map/MapView.maplibre.tsx                |  20 ++-
 components/map/MapView.types.ts                    |  16 ++
 lib/transit/metroArea.ts                           |  14 ++
 lib/transit/useGtfsLayer.ts                        | 107 +++++++++++++
 .../20260403000001_create_transit_cache_bucket.sql |   9 ++
 8 files changed, 337 insertions(+), 1 deletion(-)
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
