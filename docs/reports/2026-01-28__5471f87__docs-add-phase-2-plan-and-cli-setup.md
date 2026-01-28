# Learning Report: docs: add phase 2 plan and cli setup

- Date: 2026-01-28
- Commit: 5471f878f3bfff1080d434de5b289bfc7cb3b2f4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add phase 2 plan and cli setup"

## What Changed
```
M	.gitignore
M	CONTEXT.md
M	IMPLEMENTATION.md
M	SETUP.md
A	docs/PHASE_2_PLAN.md
A	docs/reports/2026-01-28__484b76b__chore-sync-context-and-roadmap.md
M	scripts/gen-db-types.sh
D	supabase/.temp/cli-latest
```

## File Stats
```
 .gitignore                                         |   1 +
 CONTEXT.md                                         |   1 +
 IMPLEMENTATION.md                                  |   4 +
 SETUP.md                                           |  32 +++++
 docs/PHASE_2_PLAN.md                               | 129 +++++++++++++++++++++
 ...-28__484b76b__chore-sync-context-and-roadmap.md |  50 ++++++++
 scripts/gen-db-types.sh                            |  19 ++-
 supabase/.temp/cli-latest                          |   0
 8 files changed, 230 insertions(+), 6 deletions(-)
```

## Decisions / Rationale
- Added a dedicated Phase 2 plan so work can be decomposed into small, testable slices.
- Extended the types generation script to support hosted projects without Docker via project ref.
- Documented a fresh-terminal CLI workflow to reduce setup friction and repeated mistakes.

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
- If the team wants strict CI, add a non-interactive token-based types generation step.
- Confirm the list/tag schema changes in Phase 2 plan before writing migrations.
