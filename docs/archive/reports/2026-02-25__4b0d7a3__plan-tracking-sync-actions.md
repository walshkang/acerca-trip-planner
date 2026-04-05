# Learning Report: Plan tracking sync actions

- Date: 2026-02-25
- Commit: 4b0d7a349b5667021cdcf5c12541fc9123093ee6
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Plan tracking sync actions"

## What Changed
```
M	CONTEXT.md
M	app/globals.css
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	components/ui/ContextPanel.tsx
M	docs/LIGHT_MODE_UI_SPEC.md
M	docs/PHASE_2_PLAN.md
M	docs/PLAYWRIGHT.md
M	docs/QUALITY_GATES.md
A	docs/reports/2026-02-25__7b7a86c__clarify-pmtiles-archive-plan.md
M	lib/map/styleResolver.ts
M	roadmap.json
M	tests/e2e/map-place-drawer.spec.ts
M	tests/map/styleResolver.test.ts
```

## File Stats
```
 CONTEXT.md                                         |  33 ++--
 app/globals.css                                    |  49 +++++-
 components/map/MapContainer.tsx                    | 102 +++++++++++--
 components/map/MapView.mapbox.tsx                  | 109 +++++++++++--
 components/map/MapView.maplibre.tsx                | 110 ++++++++++++--
 components/map/MapView.types.ts                    |  32 +++-
 components/ui/ContextPanel.tsx                     |   3 +-
 docs/LIGHT_MODE_UI_SPEC.md                         |  16 +-
 docs/PHASE_2_PLAN.md                               |  13 +-
 docs/PLAYWRIGHT.md                                 |   2 +-
 docs/QUALITY_GATES.md                              |   6 +-
 ...02-25__7b7a86c__clarify-pmtiles-archive-plan.md |  73 +++++++++
 lib/map/styleResolver.ts                           | 125 +++++++++++++++
 roadmap.json                                       |  32 +++-
 tests/e2e/map-place-drawer.spec.ts                 | 110 ++++++++++++++
 tests/map/styleResolver.test.ts                    | 168 +++++++++++++++++++++
 16 files changed, 896 insertions(+), 87 deletions(-)
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
