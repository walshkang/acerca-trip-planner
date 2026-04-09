# Learning Report: fix(migration): remove duplicate UPDATE policy create — it was never dropped

- Date: 2026-04-09
- Commit: b465b858371a7bb67f21ea5a51cb1d60d0999065
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(migration): remove duplicate UPDATE policy create — it was never dropped"

## What Changed
```
M	supabase/migrations/20260414000001_fix_research_rls_rpc.sql
```

## File Stats
```
 supabase/migrations/20260414000001_fix_research_rls_rpc.sql | 6 +-----
 1 file changed, 1 insertion(+), 5 deletions(-)
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
