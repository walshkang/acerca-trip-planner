# Learning Report: feat(p3-e3): UX pivot Phase 0 — foundation (schema, stores, API)

- Date: 2026-03-22
- Commit: de4dc36640e6e35ef79059b5516d93b8568c3ab2
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(p3-e3): UX pivot Phase 0 — foundation (schema, stores, API)"

## What Changed
```
M	CONTEXT.md
M	README.md
M	app/api/lists/[id]/items/[itemId]/route.ts
M	app/api/lists/[id]/items/route.ts
M	app/api/lists/[id]/route.ts
M	components/map/MapShell.tsx
M	components/stitch/ListDetailBody.tsx
M	components/stitch/ListDrawer.tsx
M	components/workspace/WorkspaceContainer.tsx
A	docs/UX_PIVOT_PLAN.md
A	docs/reports/2026-03-21__5607fc8__feat-replace-kanban-planner-with-compact-day-grid-planner-p3-e3.md
A	docs/reports/2026-03-21__82b6b37__docs-refresh-agents-md-with-tier-based-multi-agent-routing.md
A	lib/state/useNavStore.ts
A	lib/state/useTripStore.ts
M	roadmap.json
A	supabase/migrations/20260322000001_add_day_index_to_list_items.sql
```

## File Stats
```
 CONTEXT.md                                         |  20 +-
 README.md                                          |  28 +-
 app/api/lists/[id]/items/[itemId]/route.ts         |  82 +++-
 app/api/lists/[id]/items/route.ts                  |   2 +-
 app/api/lists/[id]/route.ts                        |  53 +++
 components/map/MapShell.tsx                        |   1 +
 components/stitch/ListDetailBody.tsx               |   1 +
 components/stitch/ListDrawer.tsx                   |   3 +
 components/workspace/WorkspaceContainer.tsx        |  49 +--
 docs/UX_PIVOT_PLAN.md                              | 474 +++++++++++++++++++++
 ...-planner-with-compact-day-grid-planner-p3-e3.md | 115 +++++
 ...gents-md-with-tier-based-multi-agent-routing.md |  47 ++
 lib/state/useNavStore.ts                           |  34 ++
 lib/state/useTripStore.ts                          |  73 ++++
 roadmap.json                                       |  55 ++-
 .../20260322000001_add_day_index_to_list_items.sql |  18 +
 16 files changed, 978 insertions(+), 77 deletions(-)
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
