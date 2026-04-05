# Learning Report: refactor: update MapContainer UI for improved mobile experience

- Date: 2026-02-28
- Commit: 42c7d7b0740bf551c137099bdba94bd1c564dbae
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "refactor: update MapContainer UI for improved mobile experience"

## What Changed
```
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/map/MapContainer.tsx | 11 +++++------
 1 file changed, 5 insertions(+), 6 deletions(-)
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
