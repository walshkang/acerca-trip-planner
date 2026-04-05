# Learning Report: Add neighborhood labels overlay and glyphs

- Date: 2026-02-03
- Commit: c08042e300171fd820bd9a0bf865b79db8fc2cee
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add neighborhood labels overlay and glyphs"

## What Changed
```
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
A	public/map/overlays/nyc_neighborhood_labels.geojson
M	public/map/style.maplibre.dark.json
M	public/map/style.maplibre.json
A	scripts/gen-nyc-neighborhood-labels.ts
```

## File Stats
```
 components/map/MapContainer.tsx                    |   47 +
 components/map/MapView.mapbox.tsx                  |  143 +
 components/map/MapView.maplibre.tsx                |  143 +
 components/map/MapView.types.ts                    |   15 +
 .../map/overlays/nyc_neighborhood_labels.geojson   | 4197 ++++++++++++++++++++
 public/map/style.maplibre.dark.json                |    1 +
 public/map/style.maplibre.json                     |    1 +
 scripts/gen-nyc-neighborhood-labels.ts             |  307 ++
 8 files changed, 4854 insertions(+)
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
