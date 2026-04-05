# Learning Report: fix: show transit lines at wider zoom levels with smoother fade-in

- Date: 2026-03-26
- Commit: 705138ff0d2fa08416c6caf56824e3b0811655ed
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: show transit lines at wider zoom levels with smoother fade-in"

## What Changed
```
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
```

## File Stats
```
 components/map/MapView.mapbox.tsx   | 24 +++++++++++++++++-------
 components/map/MapView.maplibre.tsx | 24 +++++++++++++++++-------
 2 files changed, 34 insertions(+), 14 deletions(-)
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
