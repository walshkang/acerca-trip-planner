# Learning Report: fix(migration): remove invalid ls.user_id refs — list_shares has no user_id column

- Date: 2026-04-09
- Commit: a962fd61096f89dc6bbe2d51dd4956c1205f36ba
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(migration): remove invalid ls.user_id refs — list_shares has no user_id column"

## What Changed
```
M	supabase/migrations/20260414000001_fix_research_rls_rpc.sql
```

## File Stats
```
 .../migrations/20260414000001_fix_research_rls_rpc.sql   | 16 +++++++---------
 1 file changed, 7 insertions(+), 9 deletions(-)
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
