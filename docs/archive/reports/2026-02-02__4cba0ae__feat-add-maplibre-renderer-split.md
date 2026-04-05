# Learning Report: feat: add maplibre renderer split

- Date: 2026-02-02
- Commit: 4cba0aea8708046f53f41a2e28dad196a76ad1d2
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add maplibre renderer split"

## What Changed
```
M	CONTEXT.md
M	components/map/MapContainer.tsx
A	components/map/MapView.mapbox.tsx
A	components/map/MapView.maplibre.tsx
A	components/map/MapView.types.ts
A	docs/reports/2026-02-02__1ff2fd8__docs-plan-maplibre-feasibility.md
M	package.json
A	public/map/style.maplibre.json
```

## File Stats
```
 CONTEXT.md                                         |  14 +-
 components/map/MapContainer.tsx                    | 300 +++++++++++----------
 components/map/MapView.mapbox.tsx                  |  93 +++++++
 components/map/MapView.maplibre.tsx                |  93 +++++++
 components/map/MapView.types.ts                    |  32 +++
 ...-02__1ff2fd8__docs-plan-maplibre-feasibility.md |  59 ++++
 package.json                                       |   1 +
 public/map/style.maplibre.json                     |  21 ++
 8 files changed, 469 insertions(+), 144 deletions(-)
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
