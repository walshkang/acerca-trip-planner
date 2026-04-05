# Learning Report: feat: add desktop planner drag-and-drop scheduling

- Date: 2026-02-07
- Commit: e3f937223b8a0d0a2ec107107965c69df852edc9
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add desktop planner drag-and-drop scheduling"

## What Changed
```
M	components/lists/ListPlanner.tsx
M	lib/lists/planner.ts
M	tests/lists/planner.test.ts
```

## File Stats
```
 components/lists/ListPlanner.tsx | 278 ++++++++++++++++++++++++++++++++-------
 lib/lists/planner.ts             |  21 +++
 tests/lists/planner.test.ts      |   8 ++
 3 files changed, 262 insertions(+), 45 deletions(-)
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
