# Learning Report: docs: update context.md — transit slices 1/2/4 shipped

- Date: 2026-04-03
- Commit: 438862e97036e4fefd2cc21a6bfd20ec199b68ba
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: update context.md — transit slices 1/2/4 shipped"

## What Changed
```
M	docs/context.md
```

## File Stats
```
 docs/context.md | 25 ++++++++++---------------
 1 file changed, 10 insertions(+), 15 deletions(-)
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
