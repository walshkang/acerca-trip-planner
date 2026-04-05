# Learning Report: feat(p3-e3): date-shift migration — preserve item positions when trip dates change

- Date: 2026-03-23
- Commit: 98fecd8fa96a0329acea6f104acbd4054321b8a6
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(p3-e3): date-shift migration — preserve item positions when trip dates change"

## What Changed
```
M	app/api/lists/[id]/route.ts
A	supabase/migrations/20260323000001_patch_list_trip_dates_shift.sql
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/seeded-helpers.ts
M	tests/lists/list-trip-patch-route.test.ts
```

## File Stats
```
 app/api/lists/[id]/route.ts                        |  28 +++
 .../20260323000001_patch_list_trip_dates_shift.sql | 149 ++++++++++++
 tests/e2e/list-planner-move.spec.ts                | 204 ++++++++++++++--
 tests/e2e/seeded-helpers.ts                        |  26 +++
 tests/lists/list-trip-patch-route.test.ts          | 256 ++++++++++++++++++++-
 5 files changed, 633 insertions(+), 30 deletions(-)
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
