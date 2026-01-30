# Learning Report: test: make e2e auth checks deterministic

- Date: 2026-01-30
- Commit: 82bd962fbda90eeb05c627aba338f640403429be
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: make e2e auth checks deterministic"

## What Changed
```
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 tests/e2e/map-place-drawer.spec.ts | 32 +++++++++++++++++++++++---------
 1 file changed, 23 insertions(+), 9 deletions(-)
```

## Decisions / Rationale
- Replaced immediate skip-on-auth checks with a deterministic wait for map load and sign-out visibility, so tests fail loudly when auth is missing rather than silently skipping.

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
- Re-run `npm run test:e2e` to confirm auth detection works and the skip reasons (if any) are data-related, not timing-related.
