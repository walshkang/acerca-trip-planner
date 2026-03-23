# Learning Report: feat(p3-e3): remove Plan tab from ExploreShell drawer

- Date: 2026-03-22
- Commit: e269e6d4b4a16cc1fbde4c6f0240fda659d7f799
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(p3-e3): remove Plan tab from ExploreShell drawer"

## What Changed
```
M	components/app/ExploreShell.tsx
M	components/map/MapShell.tsx
```

## File Stats
```
 components/app/ExploreShell.tsx | 59 +++++------------------------------------
 components/map/MapShell.tsx     |  2 +-
 2 files changed, 8 insertions(+), 53 deletions(-)
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
