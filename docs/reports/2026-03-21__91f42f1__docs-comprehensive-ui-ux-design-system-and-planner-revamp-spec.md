# Learning Report: docs: comprehensive UI/UX design system and planner revamp spec

- Date: 2026-03-21
- Commit: 91f42f1d20f85bb31699784c93090ad745e24498
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: comprehensive UI/UX design system and planner revamp spec"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
A	DESIGN.md
M	IMPLEMENTATION.md
M	README.md
M	docs/PHASE_2_KANBAN_SPEC.md
M	roadmap.json
```

## File Stats
```
 AGENTS.md                   |   1 +
 CONTEXT.md                  |  16 ++-
 DESIGN.md                   | 335 ++++++++++++++++++++++++++++++++++++++++++++
 IMPLEMENTATION.md           |   4 +-
 README.md                   |  15 +-
 docs/PHASE_2_KANBAN_SPEC.md |   2 +
 roadmap.json                |  49 +++++++
 7 files changed, 411 insertions(+), 11 deletions(-)
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
