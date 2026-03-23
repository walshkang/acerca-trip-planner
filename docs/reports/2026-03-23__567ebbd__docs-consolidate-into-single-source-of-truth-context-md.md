# Learning Report: docs: consolidate into single source of truth (CONTEXT.md)

- Date: 2026-03-23
- Commit: 567ebbd8ccdc6c524f7c06a97915a8c304f23bd3
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: consolidate into single source of truth (CONTEXT.md)"

## What Changed
```
M	CONTEXT.md
D	IMPLEMENTATION.md
D	docs/PHASE_2_UI_UX_REFACTOR_PLAN.md
D	docs/UX_PIVOT_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md                          | 152 ++++++------
 IMPLEMENTATION.md                   | 177 --------------
 docs/PHASE_2_UI_UX_REFACTOR_PLAN.md | 118 ---------
 docs/UX_PIVOT_PLAN.md               | 474 ------------------------------------
 roadmap.json                        |  44 +++-
 5 files changed, 112 insertions(+), 853 deletions(-)
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
