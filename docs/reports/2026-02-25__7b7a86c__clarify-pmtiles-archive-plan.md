# Learning Report: Clarify PMTiles archive plan

- Date: 2026-02-25
- Commit: 7b7a86c6bb9f122c9f88f80eadc659c7d4ace317
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Clarify PMTiles archive plan"

## What Changed
```
M	CONTEXT.md
M	components/map/MapContainer.tsx
M	components/map/MapView.maplibre.tsx
M	docs/PHASE_2_PLAN.md
M	docs/PLAYWRIGHT.md
A	docs/reports/2026-02-25__346af45__fix-planner-drag-reorder-test.md
A	lib/map/pmtilesProtocol.ts
A	lib/map/styleResolver.ts
M	package-lock.json
M	package.json
A	public/map/style.maplibre.pmtiles.dark.json
A	public/map/style.maplibre.pmtiles.light.json
M	tests/e2e/map-place-drawer.spec.ts
A	tests/map/styleResolver.test.ts
```

## File Stats
```
 CONTEXT.md                                         |   2 +-
 components/map/MapContainer.tsx                    |  29 ++---
 components/map/MapView.maplibre.tsx                |   2 +
 docs/PHASE_2_PLAN.md                               |   6 +-
 docs/PLAYWRIGHT.md                                 |  14 +++
 ...2-25__346af45__fix-planner-drag-reorder-test.md |  51 +++++++++
 lib/map/pmtilesProtocol.ts                         |  22 ++++
 lib/map/styleResolver.ts                           |  72 ++++++++++++
 package-lock.json                                  |  11 +-
 package.json                                       |   3 +-
 public/map/style.maplibre.pmtiles.dark.json        | 126 +++++++++++++++++++++
 public/map/style.maplibre.pmtiles.light.json       | 126 +++++++++++++++++++++
 tests/e2e/map-place-drawer.spec.ts                 |  37 ++++++
 tests/map/styleResolver.test.ts                    |  82 ++++++++++++++
 14 files changed, 564 insertions(+), 19 deletions(-)
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
