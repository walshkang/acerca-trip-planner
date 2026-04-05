# Learning Report: feat: add transit overlay toggle

- Date: 2026-02-02
- Commit: 3db191b1b8b6e6a21671b720cb56d9c23227034b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add transit overlay toggle"

## What Changed
```
M	CONTEXT.md
D	components/discovery/GhostMarker.tsx
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
A	components/map/useGeoJson.ts
M	docs/PHASE_2_PLAN.md
A	docs/reports/2026-02-02__2648761__chore-update-lockfile-for-maplibre.md
A	public/map/overlays/nyc_neighborhood_boundaries.geojson
A	public/map/overlays/nyc_subway_lines.geojson
A	public/map/overlays/nyc_subway_stations.geojson
M	roadmap.json
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 CONTEXT.md                                         |  10 +-
 components/discovery/GhostMarker.tsx               |  25 --
 components/map/MapContainer.tsx                    |  38 +++
 components/map/MapView.mapbox.tsx                  |  52 ++++
 components/map/MapView.maplibre.tsx                |  52 ++++
 components/map/MapView.types.ts                    |   4 +
 components/map/useGeoJson.ts                       |  58 +++++
 docs/PHASE_2_PLAN.md                               |  31 ++-
 ..._2648761__chore-update-lockfile-for-maplibre.md |  47 ++++
 .../overlays/nyc_neighborhood_boundaries.geojson   | 264 +++++++++++++++++++++
 public/map/overlays/nyc_subway_lines.geojson       |   1 +
 public/map/overlays/nyc_subway_stations.geojson    |   1 +
 roadmap.json                                       |   5 +-
 tests/e2e/map-place-drawer.spec.ts                 |  23 ++
 14 files changed, 579 insertions(+), 32 deletions(-)
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
