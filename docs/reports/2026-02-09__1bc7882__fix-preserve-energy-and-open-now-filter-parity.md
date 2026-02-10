# Learning Report: fix: preserve energy and open-now filter parity

- Date: 2026-02-09
- Commit: 1bc7882a8968e5527cc2e741caec2292f11c95f2
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: preserve energy and open-now filter parity"

## What Changed
```
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	lib/lists/filter-client.ts
M	tests/lists/filter-client.test.ts
```

## File Stats
```
 components/lists/ListDetailBody.tsx  | 58 ++++++++++++++++++++---
 components/lists/ListDetailPanel.tsx | 48 ++++++++++++++++++-
 components/lists/ListDrawer.tsx      | 90 ++++++++++++++++++++++++++++--------
 lib/lists/filter-client.ts           | 70 ++++++++++++++++++++++++++--
 tests/lists/filter-client.test.ts    | 22 ++++++++-
 5 files changed, 256 insertions(+), 32 deletions(-)
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
