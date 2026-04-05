# Learning Report: feat(p3-e3): UX pivot Phase 1 — shell split (AppShell + ExploreShell + PlannerShell)

- Date: 2026-03-22
- Commit: b3ad406296806e6f9968cbb28f6359f51503de06
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(p3-e3): UX pivot Phase 1 — shell split (AppShell + ExploreShell + PlannerShell)"

## What Changed
```
M	app/page.tsx
A	components/app/AppShell.tsx
A	components/app/ExploreShell.tsx
A	components/app/PlannerShell.tsx
M	components/workspace/WorkspaceContainer.tsx
```

## File Stats
```
 app/page.tsx                                |  22 +-
 components/app/AppShell.tsx                 |  24 +
 components/app/ExploreShell.tsx             | 936 +++++++++++++++++++++++++++
 components/app/PlannerShell.tsx             |  41 ++
 components/workspace/WorkspaceContainer.tsx | 939 +---------------------------
 5 files changed, 1016 insertions(+), 946 deletions(-)
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
