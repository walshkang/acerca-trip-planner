# Learning Report: feat(sources): Sources H — clean map, list overlay, unvetted markers, social visibility gate

- Date: 2026-04-08
- Commit: 2a3e490a3089973af112c4645726ae2e918903d3
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(sources): Sources H — clean map, list overlay, unvetted markers, social visibility gate"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
M	components/app/ExploreShellPaper.tsx
M	components/app/SourcesShellPaper.tsx
M	components/map/MapShell.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
A	supabase/migrations/20260412000003_fix_places_policy_recursion.sql
A	supabase/migrations/20260412000004_places_view_hide_unlisted_social.sql
```

## File Stats
```
 AGENTS.md                                          |  23 +++-
 CONTEXT.md                                         |  17 ++-
 components/app/ExploreShellPaper.tsx               |   1 +
 components/app/SourcesShellPaper.tsx               | 118 ++++++++++++++++++++-
 components/map/MapShell.tsx                        |  24 ++++-
 components/map/MapView.maplibre.tsx                |  32 ++++--
 components/map/MapView.types.ts                    |   4 +
 .../20260412000003_fix_places_policy_recursion.sql |  32 ++++++
 ...0412000004_places_view_hide_unlisted_social.sql |  19 ++++
 9 files changed, 247 insertions(+), 23 deletions(-)
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
