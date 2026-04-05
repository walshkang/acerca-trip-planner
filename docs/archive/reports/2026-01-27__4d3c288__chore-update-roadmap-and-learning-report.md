# Learning Report: chore: update roadmap and learning report

- Date: 2026-01-27
- Commit: 4d3c2885bd4607e5f8b66e5b0a8acde267c0cb90
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: update roadmap and learning report"

## What Changed
```
A	docs/reports/2026-01-27__dedf121__feat-add-lists-schema.md
M	roadmap.json
```

## File Stats
```
 .../2026-01-27__dedf121__feat-add-lists-schema.md  | 53 ++++++++++++++++++++++
 roadmap.json                                       | 26 +++++------
 2 files changed, 66 insertions(+), 13 deletions(-)
```

## Decisions / Rationale
- Marked completed P1-E5 tasks and updated progress summary to reflect the current discovery flow and list schema work.
- Captured next steps in the roadmap to keep Phase 2 gates explicit.

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
- Build list CRUD + assignment UI and create a default “Saved” list.
- Extend promotion to assign list membership transactionally and show list membership on place detail.
