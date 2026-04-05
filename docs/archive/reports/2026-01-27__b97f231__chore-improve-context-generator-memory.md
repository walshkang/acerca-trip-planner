# Learning Report: chore: improve context generator memory

- Date: 2026-01-27
- Commit: b97f2310f9f23aa3a5b062c2e429bf6dd2e6fbca
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: improve context generator memory"

## What Changed
```
M	CONTEXT.md
M	scripts/generate-context.ts
```

## File Stats
```
 CONTEXT.md                  |  10 ++--
 scripts/generate-context.ts | 121 ++++++++++++++++++++++++++++++++++++--------
 2 files changed, 103 insertions(+), 28 deletions(-)
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
