# Learning Report: test: click mapbox markers reliably

- Date: 2026-01-30
- Commit: 25935f80222c3a74c7d8405e34414bc49aaae0c5
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: click mapbox markers reliably"

## What Changed
```
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 tests/e2e/map-place-drawer.spec.ts | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Switched the marker click target to the Mapbox marker container and forced the click to avoid image-level pointer interception in the map canvas.

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
- Re-run `npm run test:e2e` to confirm the overlay stacking test can click a marker.
