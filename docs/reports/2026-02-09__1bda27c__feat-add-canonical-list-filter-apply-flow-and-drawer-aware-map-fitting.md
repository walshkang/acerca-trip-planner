# Learning Report: feat: add canonical list filter apply flow and drawer-aware map fitting

- Date: 2026-02-09
- Commit: 1bda27cf1eafb5ae6ad7596f759d8a6031d8a33a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add canonical list filter apply flow and drawer-aware map fitting"

## What Changed
```
M	app/api/lists/[id]/items/route.ts
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	docs/plans/p2-e2-filter-schema/flowchart.json
M	docs/plans/p2-e2-filter-schema/mockup.json
M	docs/plans/p2-e2-filter-schema/plan.md
M	lib/lists/filters.ts
M	tests/lists/filters.test.ts
```

## File Stats
```
 app/api/lists/[id]/items/route.ts             | 142 +++++++++-
 components/lists/ListDetailBody.tsx           | 190 ++++++++++++-
 components/lists/ListDrawer.tsx               | 380 +++++++++++++++++++++-----
 components/map/MapContainer.tsx               |  57 +++-
 docs/plans/p2-e2-filter-schema/flowchart.json |  53 +++-
 docs/plans/p2-e2-filter-schema/mockup.json    | 163 ++++++++++-
 docs/plans/p2-e2-filter-schema/plan.md        |  64 +++++
 lib/lists/filters.ts                          | 357 +++++++++++++++++++++++-
 tests/lists/filters.test.ts                   | 113 +++++++-
 9 files changed, 1418 insertions(+), 101 deletions(-)
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
