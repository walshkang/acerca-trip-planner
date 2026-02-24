# Learning Report: Plan seeded planner DnD tests

- Date: 2026-02-24
- Commit: eba436817700eb694b801b53124eac92817c0a4b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Plan seeded planner DnD tests"

## What Changed
```
M	CONTEXT.md
M	docs/PLAYWRIGHT.md
M	docs/QUALITY_GATES.md
M	tests/e2e/list-planner-move.spec.ts
```

## File Stats
```
 CONTEXT.md                          |   8 +-
 docs/PLAYWRIGHT.md                  |   2 +-
 docs/QUALITY_GATES.md               |   2 +-
 tests/e2e/list-planner-move.spec.ts | 224 +++++++++++++++++++++++++++++++++++-
 4 files changed, 231 insertions(+), 5 deletions(-)
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
