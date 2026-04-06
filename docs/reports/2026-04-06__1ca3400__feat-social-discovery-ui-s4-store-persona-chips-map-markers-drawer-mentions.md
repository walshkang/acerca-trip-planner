# Learning Report: feat: social discovery UI — S4 store, persona chips, map markers, drawer mentions

- Date: 2026-04-06
- Commit: 1ca3400d194fcba630e1f29570b3c88cbd48f42a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: social discovery UI — S4 store, persona chips, map markers, drawer mentions"

## What Changed
```
M	app/api/enrichment/ingest-social/__tests__/integration.test.ts
M	app/api/places/[id]/details/route.ts
M	components/app/ExploreShellPaper.tsx
M	components/map/MapShell.tsx
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/map/MapView.types.ts
M	components/paper/PaperExplorePanel.tsx
A	components/stitch/PersonaFilterChips.tsx
M	components/stitch/PlaceDrawer.tsx
M	lib/server/social/ingest.ts
A	lib/state/useSocialDiscoveryStore.ts
M	scripts/seed-social-discovery.ts
```

## File Stats
```
 .../ingest-social/__tests__/integration.test.ts    |   2 +-
 app/api/places/[id]/details/route.ts               |  39 +++++++-
 components/app/ExploreShellPaper.tsx               |  23 +++++
 components/map/MapShell.tsx                        |  24 +++--
 components/map/MapView.mapbox.tsx                  |  14 ++-
 components/map/MapView.maplibre.tsx                |  14 ++-
 components/map/MapView.types.ts                    |   1 +
 components/paper/PaperExplorePanel.tsx             |   3 +
 components/stitch/PersonaFilterChips.tsx           |  61 ++++++++++++
 components/stitch/PlaceDrawer.tsx                  |  50 ++++++++++
 lib/server/social/ingest.ts                        |   2 +-
 lib/state/useSocialDiscoveryStore.ts               | 107 +++++++++++++++++++++
 scripts/seed-social-discovery.ts                   |  18 ++--
 13 files changed, 333 insertions(+), 25 deletions(-)
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
