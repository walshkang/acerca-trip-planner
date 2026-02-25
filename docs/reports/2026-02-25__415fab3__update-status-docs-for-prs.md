# Learning Report: Update status docs for PRs

- Date: 2026-02-25
- Commit: 415fab3f5f7326a539473c6968282d4e1906b5f3
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Update status docs for PRs"

## What Changed
```
M	CONTEXT.md
M	components/map/MapContainer.tsx
A	docs/reports/2026-02-25__4b0d7a3__plan-tracking-sync-actions.md
M	lib/map/styleResolver.ts
```

## File Stats
```
 CONTEXT.md                                         |  4 +-
 components/map/MapContainer.tsx                    | 41 ++++++++++++
 ...6-02-25__4b0d7a3__plan-tracking-sync-actions.md | 77 ++++++++++++++++++++++
 lib/map/styleResolver.ts                           |  4 +-
 4 files changed, 123 insertions(+), 3 deletions(-)
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
