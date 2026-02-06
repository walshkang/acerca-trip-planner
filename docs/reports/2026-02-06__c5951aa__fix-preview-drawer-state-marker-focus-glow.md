# Learning Report: fix: preview drawer state + marker focus glow

- Date: 2026-02-06
- Commit: c5951aa47c203f24e27bdfd418f6d9d6f3d491ab
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: preview drawer state + marker focus glow"

## What Changed
```
M	app/api/places/ingest/route.ts
M	components/discovery/InspectorCard.tsx
M	components/map/MapContainer.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	lib/state/useDiscoveryStore.ts
A	lib/ui/previewMode.ts
A	tests/ui/previewMode.test.ts
```

## File Stats
```
 app/api/places/ingest/route.ts         |  20 ++++
 components/discovery/InspectorCard.tsx | 105 +++++++++++++++++
 components/map/MapContainer.tsx        | 208 ++++++++++++++++++++++++---------
 components/map/MapView.mapbox.tsx      |  13 ++-
 components/map/MapView.maplibre.tsx    |  13 ++-
 components/map/MapView.types.ts        |   2 +
 lib/state/useDiscoveryStore.ts         |  28 +++++
 lib/ui/previewMode.ts                  |  13 +++
 tests/ui/previewMode.test.ts           |  45 +++++++
 9 files changed, 390 insertions(+), 57 deletions(-)
```

## Decisions / Rationale
- Fixed “click search result → nothing happens” when a place drawer was already open by making Preview a first-class mode that overrides the existing `?place=` selection while ingest runs.
- Stabilized the drawer chrome so the top title doesn’t thrash between Lists/Place/Preview; “Preview” is now a state of the Details surface, not a different drawer.
- Added immediate map feedback for previews (fly to the preview location + highlighted ghost pin) and made focused pins visibly glow in both light/dark themes.
- Tradeoffs: `/api/places/ingest` now returns a small `google` details object for the preview UI; and the discovery store carries a bit more preview state (`previewGoogle`, `selectedResult`).

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
- Consider splitting `selectedResultId` into a dedicated preview state field to avoid overloading selection semantics.
- If/when Playwright seeding is restored, add E2E coverage for “place drawer open → Omnibox preview takes over” and for focused marker glow styling.
- Decide whether the preview “More details” section should be promoted into the approved place drawer (and if so, which fields stay in DB vs. stay as external links).
