# Learning Report: docs: plan maplibre feasibility

- Date: 2026-02-02
- Commit: 1ff2fd8a6a136386859a394a1aea273257ff1752
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: plan maplibre feasibility"

## What Changed
```
M	CONTEXT.md
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	docs/PHASE_2_PLAN.md
M	docs/PLAYWRIGHT.md
A	docs/reports/2026-02-02__e77d66e__docs-add-maplibre-feasibility-note.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md                                         | 11 ++++-
 components/lists/ListDrawer.tsx                    |  6 +++
 components/map/MapContainer.tsx                    | 14 +++++-
 docs/PHASE_2_PLAN.md                               | 41 ++++++++++-------
 docs/PLAYWRIGHT.md                                 |  9 ++++
 ..._e77d66e__docs-add-maplibre-feasibility-note.md | 53 ++++++++++++++++++++++
 roadmap.json                                       |  5 +-
 7 files changed, 117 insertions(+), 22 deletions(-)
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
