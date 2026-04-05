# Learning Report: docs: bake map-first membership plan

- Date: 2026-01-29
- Commit: 83cb5bf5598e537e87de713d94230f2deda5c721
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: bake map-first membership plan"

## What Changed
```
M	CONTEXT.md
M	IMPLEMENTATION.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md           |  6 ++++--
 IMPLEMENTATION.md    |  2 ++
 docs/PHASE_2_PLAN.md | 22 +++++++++++++++++++---
 roadmap.json         |  5 ++++-
 4 files changed, 29 insertions(+), 6 deletions(-)
```

## Decisions / Rationale
- Updated Phase 2 plans to reflect multi-list add/remove semantics and URL-driven drawers.
- Ensured roadmap and context align with the map-first workflow and deep-linking requirement.

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
- Implement list membership add/remove endpoints and URL-driven place drawer.
