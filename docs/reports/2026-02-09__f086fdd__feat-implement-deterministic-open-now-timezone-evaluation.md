# Learning Report: feat: implement deterministic open-now timezone evaluation

- Date: 2026-02-09
- Commit: f086fdd3003983cf2675f77189cc0a2373eb9fd5
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: implement deterministic open-now timezone evaluation"

## What Changed
```
M	app/api/filters/query/route.ts
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	components/lists/ListPlanner.tsx
A	docs/reports/2026-02-09__1bc7882__fix-preserve-energy-and-open-now-filter-parity.md
A	lib/filters/open-now.ts
M	lib/lists/planner.ts
A	tests/filters/open-now.test.ts
M	tests/filters/query-route.test.ts
M	tests/lists/planner.test.ts
```

## File Stats
```
 app/api/filters/query/route.ts                     | 103 +++++++--
 components/lists/ListDetailPanel.tsx               |  74 +++++-
 components/lists/ListDrawer.tsx                    |  74 +++++-
 components/lists/ListPlanner.tsx                   |   5 +-
 ...x-preserve-energy-and-open-now-filter-parity.md |  55 +++++
 lib/filters/open-now.ts                            | 252 +++++++++++++++++++++
 lib/lists/planner.ts                               |  29 +++
 tests/filters/open-now.test.ts                     | 103 +++++++++
 tests/filters/query-route.test.ts                  | 216 +++++++++++++++++-
 tests/lists/planner.test.ts                        |  14 ++
 10 files changed, 890 insertions(+), 35 deletions(-)
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
