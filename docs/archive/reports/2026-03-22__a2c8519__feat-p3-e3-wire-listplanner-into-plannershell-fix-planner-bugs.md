# Learning Report: feat(p3-e3): wire ListPlanner into PlannerShell + fix planner bugs

- Date: 2026-03-22
- Commit: a2c8519646a336f53ff9e5097385f833e4e58228
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(p3-e3): wire ListPlanner into PlannerShell + fix planner bugs"

## What Changed
```
M	components/app/PlannerShell.tsx
M	components/stitch/planner/PlannerBacklog.tsx
M	components/stitch/planner/PlannerDayCell.tsx
M	components/stitch/planner/PlannerDayDetail.tsx
M	components/stitch/planner/planner-utils.ts
```

## File Stats
```
 components/app/PlannerShell.tsx                | 61 ++++++++++++++++----------
 components/stitch/planner/PlannerBacklog.tsx   | 11 +++++
 components/stitch/planner/PlannerDayCell.tsx   |  2 +
 components/stitch/planner/PlannerDayDetail.tsx | 15 ++++---
 components/stitch/planner/planner-utils.ts     |  6 +++
 5 files changed, 67 insertions(+), 28 deletions(-)
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
