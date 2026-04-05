# Learning Report: feat: add dark map style

- Date: 2026-02-02
- Commit: c8e59668c652697273c14c4d50d1f8ea881b0205
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add dark map style"

## What Changed
```
M	CONTEXT.md
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	docs/PHASE_2_PLAN.md
A	public/map/style.maplibre.dark.json
M	roadmap.json
```

## File Stats
```
 CONTEXT.md                          |  2 +-
 components/map/MapContainer.tsx     | 63 ++++++++++++++++++++++++++++++++-----
 components/map/MapView.mapbox.tsx   | 11 +++++--
 components/map/MapView.maplibre.tsx | 11 +++++--
 components/map/MapView.types.ts     |  1 +
 docs/PHASE_2_PLAN.md                |  2 ++
 public/map/style.maplibre.dark.json | 34 ++++++++++++++++++++
 roadmap.json                        |  2 +-
 8 files changed, 113 insertions(+), 13 deletions(-)
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
