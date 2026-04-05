# Learning Report: feat: add visual planning artifacts and validation workflow

- Date: 2026-02-09
- Commit: c952559f1be4c9145f99cfb527fe3e32f65edf9e
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add visual planning artifacts and validation workflow"

## What Changed
```
A	docs/plans/README.md
A	docs/plans/p2-e2-filter-schema/flowchart.json
A	docs/plans/p2-e2-filter-schema/mockup.json
A	docs/plans/p2-e2-filter-schema/plan.md
A	lib/planning/schemas/flowchart.schema.json
A	lib/planning/schemas/mockup.schema.json
M	package.json
A	scripts/plan-new.mjs
A	scripts/plan-validate.mjs
```

## File Stats
```
 docs/plans/README.md                          |  18 +++
 docs/plans/p2-e2-filter-schema/flowchart.json |  82 ++++++++++++
 docs/plans/p2-e2-filter-schema/mockup.json    | 108 +++++++++++++++
 docs/plans/p2-e2-filter-schema/plan.md        |  20 +++
 lib/planning/schemas/flowchart.schema.json    |  41 ++++++
 lib/planning/schemas/mockup.schema.json       |  44 ++++++
 package.json                                  |   4 +-
 scripts/plan-new.mjs                          | 104 +++++++++++++++
 scripts/plan-validate.mjs                     | 184 ++++++++++++++++++++++++++
 9 files changed, 604 insertions(+), 1 deletion(-)
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
