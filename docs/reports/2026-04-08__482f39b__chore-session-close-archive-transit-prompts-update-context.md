# Learning Report: chore: session close — archive transit prompts, update context

- Date: 2026-04-08
- Commit: 482f39b69101d287c336bdd28f8ad6cb5c56f991
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: session close — archive transit prompts, update context"

## What Changed
```
M	CONTEXT.md
A	cursor-prompts/archive/transit-coverage-s1.md
A	cursor-prompts/archive/transit-coverage-s4.md
```

## File Stats
```
 CONTEXT.md                                    |  14 +-
 cursor-prompts/archive/transit-coverage-s1.md | 115 ++++++++++
 cursor-prompts/archive/transit-coverage-s4.md | 290 ++++++++++++++++++++++++++
 3 files changed, 415 insertions(+), 4 deletions(-)
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
