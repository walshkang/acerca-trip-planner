# Learning Report: docs: update docs for paper shell cleanup; delete roadmap.json

- Date: 2026-03-26
- Commit: fe26e15093b1789f89064053f5e441354629db49
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: update docs for paper shell cleanup; delete roadmap.json"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
M	DESIGN.md
M	README.md
M	components/stitch/README.md
M	package.json
D	roadmap.json
D	scripts/generate-context.ts
```

## File Stats
```
 AGENTS.md                   |   4 +-
 CONTEXT.md                  |  12 +-
 DESIGN.md                   |  16 +-
 README.md                   |   2 +-
 components/stitch/README.md |   2 +-
 package.json                |   6 +-
 roadmap.json                | 958 --------------------------------------------
 scripts/generate-context.ts | 428 --------------------
 8 files changed, 21 insertions(+), 1407 deletions(-)
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
