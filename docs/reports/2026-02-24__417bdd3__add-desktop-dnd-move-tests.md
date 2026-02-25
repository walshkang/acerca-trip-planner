# Learning Report: Add desktop DnD move tests

- Date: 2026-02-24
- Commit: 417bdd335d26493b5e97689e4facc321cbc5c0e8
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add desktop DnD move tests"

## What Changed
```
M	CONTEXT.md
M	docs/PLAYWRIGHT.md
M	docs/QUALITY_GATES.md
A	docs/reports/2026-02-24__eba4368__plan-seeded-planner-dnd-tests.md
M	tests/e2e/list-planner-move.spec.ts
```

## File Stats
```
 CONTEXT.md                                         |   9 +-
 docs/PLAYWRIGHT.md                                 |   2 +-
 docs/QUALITY_GATES.md                              |   2 +-
 ...2-24__eba4368__plan-seeded-planner-dnd-tests.md |  53 +++++++
 tests/e2e/list-planner-move.spec.ts                | 153 ++++++++++++++++++++-
 5 files changed, 212 insertions(+), 7 deletions(-)
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
