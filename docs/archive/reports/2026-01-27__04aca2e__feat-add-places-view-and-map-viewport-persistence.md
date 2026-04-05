# Learning Report: feat: add places_view and map viewport persistence

- Date: 2026-01-27
- Commit: 04aca2efe4ecd6e43d329a0c21897dbb36563b03
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add places_view and map viewport persistence"

## What Changed
```
M	CONTEXT.md
M	components/map/MapContainer.tsx
M	lib/supabase/types.ts
M	roadmap.json
A	supabase/migrations/20260127000006_create_places_view.sql
```

## File Stats
```
 CONTEXT.md                                         |   4 +-
 components/map/MapContainer.tsx                    | 170 ++++---
 lib/supabase/types.ts                              | 540 ++-------------------
 roadmap.json                                       |  12 +-
 .../20260127000006_create_places_view.sql          |  11 +
 5 files changed, 156 insertions(+), 581 deletions(-)
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
