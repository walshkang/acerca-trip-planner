# Learning Report: Swap map markers to emoji

- Date: 2026-02-02
- Commit: 313fdf5b700aeed8704afed919ed231bca991619
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Swap map markers to emoji"

## What Changed
```
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	lib/icons/mapping.ts
```

## File Stats
```
 components/map/MapContainer.tsx     |  3 ---
 components/map/MapView.mapbox.tsx   | 14 +++++++-------
 components/map/MapView.maplibre.tsx | 14 +++++++-------
 components/map/MapView.types.ts     |  1 -
 lib/icons/mapping.ts                | 17 +++++++++++++++++
 5 files changed, 31 insertions(+), 18 deletions(-)
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
