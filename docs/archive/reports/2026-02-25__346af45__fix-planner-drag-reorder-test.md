# Learning Report: Fix planner drag reorder test

- Date: 2026-02-25
- Commit: 346af4520114076c94e826ac965b841e93d82f49
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Fix planner drag reorder test"

## What Changed
```
M	components/lists/ListPlanner.tsx
M	tests/e2e/list-planner-move.spec.ts
M	tests/e2e/seeded-helpers.ts
```

## File Stats
```
 components/lists/ListPlanner.tsx    |  11 +-
 tests/e2e/list-planner-move.spec.ts | 194 ++++++++++++++++++++++++++++--------
 tests/e2e/seeded-helpers.ts         |  57 ++++++++---
 3 files changed, 206 insertions(+), 56 deletions(-)
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
