# Learning Report: chore: enhance CONTEXT.md with detailed roadmap and phase information, and add tsx dependency to package-lock.json

- Date: 2026-01-27
- Commit: 11fb70914016e395782a3bd1f714469c7dd1c490
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: enhance CONTEXT.md with detailed roadmap and phase information, and add tsx dependency to package-lock.json"

## What Changed
```
M	CONTEXT.md
M	package-lock.json
```

## File Stats
```
 CONTEXT.md        | 70 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
 package-lock.json | 21 +++++++++++++++++
 2 files changed, 91 insertions(+)
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
