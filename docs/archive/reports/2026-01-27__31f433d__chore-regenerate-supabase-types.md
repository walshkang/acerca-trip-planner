# Learning Report: chore: regenerate supabase types

- Date: 2026-01-27
- Commit: 31f433d77227c67f8c1188901f935f1e36ac5b05
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: regenerate supabase types"

## What Changed
```
M	lib/supabase/types.ts
```

## File Stats
```
 lib/supabase/types.ts | 10 ++++++----
 1 file changed, 6 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Regenerated types after the promote RPC signature changed to include optional list assignment.

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
- Push the updated types and validate list assignment in the UI.
