# Learning Report: fix: resolve TypeScript errors introduced by codex branch

- Date: 2026-04-07
- Commit: 195d1d448024fe9c30b7b419c4163e228a6ce3d6
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: resolve TypeScript errors introduced by codex branch"

## What Changed
```
M	lib/server/testSeed.ts
M	playwright/global-setup.ts
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 lib/server/testSeed.ts                      | 4 ++--
 playwright/global-setup.ts                  | 6 +++---
 tests/e2e/list-filters-and-map-link.spec.ts | 4 ++--
 tests/e2e/list-local-search.spec.ts         | 4 ++--
 tests/e2e/map-place-drawer.spec.ts          | 4 ++--
 5 files changed, 11 insertions(+), 11 deletions(-)
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
