# Learning Report: fix: cast digest input for dedupe_key

- Date: 2026-01-27
- Commit: 9a26b9fc7de21d9d3426edb80130d0845e646336
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: cast digest input for dedupe_key"

## What Changed
```
A	supabase/migrations/20260127000001_fix_promote_rpc_digest.sql
```

## File Stats
```
 .../20260127000001_fix_promote_rpc_digest.sql      | 192 +++++++++++++++++++++
 1 file changed, 192 insertions(+)
```

## Decisions / Rationale
- Draft pending: capture rationale and tradeoffs in a follow-up pass.

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
- Draft pending: document follow-ups/risks in a follow-up pass.
