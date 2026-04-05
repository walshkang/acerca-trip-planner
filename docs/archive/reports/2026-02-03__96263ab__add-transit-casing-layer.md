# Learning Report: Add transit casing layer

- Date: 2026-02-03
- Commit: 96263abc59934767853bf2cce1c27b05dcd07ed8
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add transit casing layer"

## What Changed
```
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
```

## File Stats
```
 components/map/MapContainer.tsx     |  12 +-
 components/map/MapView.mapbox.tsx   | 223 ++++++++++++++++++++++-------------
 components/map/MapView.maplibre.tsx | 226 +++++++++++++++++++++++-------------
 components/map/MapView.types.ts     |   5 +
 4 files changed, 309 insertions(+), 157 deletions(-)
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
