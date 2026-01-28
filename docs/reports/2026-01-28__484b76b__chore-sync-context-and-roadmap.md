# Learning Report: chore: sync context and roadmap

- Date: 2026-01-28
- Commit: 484b76b55d71fc221a853e2448d7a38da1af1ec9
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: sync context and roadmap"

## What Changed
```
M	CONTEXT.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md   | 10 +++++++---
 roadmap.json | 14 +++++++++++++-
 2 files changed, 20 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Synced context and roadmap entries to match the recent commit history so current phase tracking stays accurate.
- Recorded the types regeneration + lists link updates explicitly to remove ambiguity about the Phase 1 blocker.

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
- Keep learning reports aligned with context updates to avoid drift.
