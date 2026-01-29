# Learning Report: docs: plan list add flow and wiki gating

- Date: 2026-01-29
- Commit: 40b1c0aea04dd5dea98fed3583c0dc3e5b7b7f8b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: plan list add flow and wiki gating"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md           |  4 +++-
 docs/PHASE_2_PLAN.md | 19 +++++++++++++++----
 roadmap.json         |  6 +++++-
 3 files changed, 23 insertions(+), 6 deletions(-)
```

## Decisions / Rationale
- Documented the next P2-E3 slice so list add flows, tag seeding, and wiki gating stay aligned with the roadmap.
- Kept the plan canonical-only for list search to avoid duplicating ingestion UX in Phase 2.

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
- Implement list creation from the map drawer and local search add-to-list with optional tags.
- Add add-time tag seeding/union behavior in list membership POST.
- Gate Wikipedia summaries to Sights-only in preview + detail views.
