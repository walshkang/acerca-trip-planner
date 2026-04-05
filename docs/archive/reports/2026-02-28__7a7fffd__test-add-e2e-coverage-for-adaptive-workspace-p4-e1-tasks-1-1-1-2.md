# Learning Report: test: add E2E coverage for adaptive workspace (P4-E1 tasks 1.1, 1.2)

- Date: 2026-02-28
- Commit: 7a7fffdd9d0ecafb414eca49eac565a5f6ca4096
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: add E2E coverage for adaptive workspace (P4-E1 tasks 1.1, 1.2)"

## What Changed
```
M	components/ui/ContextPanel.tsx
A	tests/e2e/workspace-adaptive.spec.ts
```

## File Stats
```
 components/ui/ContextPanel.tsx       |   4 +
 tests/e2e/workspace-adaptive.spec.ts | 154 +++++++++++++++++++++++++++++++++++
 2 files changed, 158 insertions(+)
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
