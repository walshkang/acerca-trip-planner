# Learning Report: chore: stabilize quality gates and status workflow

- Date: 2026-02-09
- Commit: 3f7c0aa16a86590e0944bbd8e44eb8b94ccbde3b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: stabilize quality gates and status workflow"

## What Changed
```
A	docs/QUALITY_GATES.md
A	docs/reports/2026-02-09__f7bb0d9__chore-add-codex-artifacts-and-learning-reports.md
M	package.json
M	scripts/generate-learning-report.sh
A	scripts/status.mjs
```

## File Stats
```
 docs/QUALITY_GATES.md                              | 29 +++++++++
 ...ore-add-codex-artifacts-and-learning-reports.md | 53 ++++++++++++++++
 package.json                                       |  2 +
 scripts/generate-learning-report.sh                |  4 +-
 scripts/status.mjs                                 | 72 ++++++++++++++++++++++
 5 files changed, 158 insertions(+), 2 deletions(-)
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
