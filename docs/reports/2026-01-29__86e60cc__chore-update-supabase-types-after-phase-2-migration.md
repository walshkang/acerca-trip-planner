# Learning Report: chore: update supabase types after phase 2 migration

- Date: 2026-01-29
- Commit: 86e60cce89fcf474ea9034c43ad4b76db9afd947
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: update supabase types after phase 2 migration"

## What Changed
```
M	lib/supabase/types.ts
```

## File Stats
```
 lib/supabase/types.ts | 36 ++++++++++++++++++++++++++++++++++++
 1 file changed, 36 insertions(+)
```

## Decisions / Rationale
- Regenerated types to reflect the new scheduling and tag fields added to list_items and lists.

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
- Pull the updated types in any dependent branches before implementing the new API routes.
