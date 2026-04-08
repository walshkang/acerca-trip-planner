# Learning Report: fix(rls): allow social places in list_items; shape sources-g card highlight

- Date: 2026-04-08
- Commit: 78eaf8dcbd80cb9f6eb2f1a4b5cbb81b71a36a4a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(rls): allow social places in list_items; shape sources-g card highlight"

## What Changed
```
A	cursor-prompts/sources-g-card-map-highlight.md
A	supabase/migrations/20260412000001_list_items_allow_social_places.sql
```

## File Stats
```
 cursor-prompts/sources-g-card-map-highlight.md     | 109 +++++++++++++++++++++
 ...260412000001_list_items_allow_social_places.sql |  28 ++++++
 2 files changed, 137 insertions(+)
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
