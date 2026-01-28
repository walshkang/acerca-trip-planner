# Learning Report: fix: parse PostGIS POINT locations for map pins

- Date: 2026-01-27
- Commit: e1d391c761d09adba7178617731689014cc5613b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: parse PostGIS POINT locations for map pins"

## What Changed
```
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/map/MapContainer.tsx | 57 +++++++++++++++++++++++++++++++++--------
 1 file changed, 47 insertions(+), 10 deletions(-)
```

## Decisions / Rationale
- Draft pending: capture rationale and tradeoffs in a follow-up pass.

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
- Draft pending: document follow-ups/risks in a follow-up pass.
