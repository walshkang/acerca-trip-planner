# Learning Report: Update Phase 2 tracking and roadmap status

- Date: 2026-02-02
- Commit: aaf55fb05a5846ce0b527f712f2cd2c37690e60c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Update Phase 2 tracking and roadmap status"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md           | 2 +-
 docs/PHASE_2_PLAN.md | 9 ++++++---
 roadmap.json         | 6 +++---
 3 files changed, 10 insertions(+), 7 deletions(-)
```

## Decisions / Rationale
- TODO: Add why these changes were made and any tradeoffs.

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
- TODO: List follow-ups or risks.
