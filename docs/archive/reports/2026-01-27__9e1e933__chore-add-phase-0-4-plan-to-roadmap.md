# Learning Report: chore: add phase 0-4 plan to roadmap

- Date: 2026-01-27
- Commit: 9e1e933b4dfe88e17f91d353e263d187f5f015d1
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: add phase 0-4 plan to roadmap"

## What Changed
```
M	CONTEXT.md
M	IMPLEMENTATION.md
M	README.md
M	roadmap.json
M	scripts/generate-context.ts
```

## File Stats
```
 CONTEXT.md                  |  86 ++++---------------------------------
 IMPLEMENTATION.md           |  28 ++++++++----
 README.md                   |  10 ++++-
 roadmap.json                | 102 +++++++++++++++++++++++++++++++++++++++++---
 scripts/generate-context.ts |  27 +++++++++---
 5 files changed, 154 insertions(+), 99 deletions(-)
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
