# Learning Report: docs: refine phase 2 plan ordering and trips

- Date: 2026-01-28
- Commit: e1a361eb941c228b1feb17266dd98a730e0b8a4c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: refine phase 2 plan ordering and trips"

## What Changed
```
M	docs/PHASE_2_PLAN.md
```

## File Stats
```
 docs/PHASE_2_PLAN.md | 15 +++++++++++++--
 1 file changed, 13 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Switched to fractional ordering to avoid expensive reindexing when reordering items.
- Added trip date/timezone guidance so day buckets are deterministic and list-scoped.
- Clarified Open Now filtering as client-side for Phase 2 to avoid slow SQL JSON parsing.

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
- Decide whether list trip metadata should be required for Kanban mode.
- Confirm tag normalization rules before building the tag editor.
