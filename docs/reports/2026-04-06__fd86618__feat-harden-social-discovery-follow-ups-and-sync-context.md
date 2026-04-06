# Learning Report: feat: harden social discovery follow-ups and sync context

- Date: 2026-04-06
- Commit: fd866183420ea0a241139f59f69dc2427fd16cca
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: harden social discovery follow-ups and sync context"

## What Changed
```
M	.env.example
M	CONTEXT.md
M	README.md
M	app/api/enrichment/ingest-social/__tests__/integration.test.ts
M	app/api/places/[id]/details/route.ts
M	components/map/MapView.mapbox.tsx
M	components/map/MapView.maplibre.tsx
M	components/stitch/PersonaFilterChips.tsx
M	components/stitch/PlaceDrawer.tsx
D	docs/context.md
M	lib/server/social/ingest.ts
A	lib/social/marker-size.ts
A	lib/social/ui-state.ts
M	lib/state/useSocialDiscoveryStore.ts
M	package.json
M	scripts/seed-social-discovery.ts
A	tests/places/place-details-route.test.ts
A	tests/social/marker-size.test.ts
A	tests/social/ui-state.test.ts
```

## File Stats
```
 .env.example                                       |   3 +
 CONTEXT.md                                         |  13 +-
 README.md                                          |   5 +
 .../ingest-social/__tests__/integration.test.ts    | 244 +++++++++++++++++++--
 app/api/places/[id]/details/route.ts               |  17 +-
 components/map/MapView.mapbox.tsx                  |  19 +-
 components/map/MapView.maplibre.tsx                |   9 +-
 components/stitch/PersonaFilterChips.tsx           |  14 +-
 components/stitch/PlaceDrawer.tsx                  |  99 ++++++---
 docs/context.md                                    |  53 -----
 lib/server/social/ingest.ts                        |  37 +++-
 lib/social/marker-size.ts                          |   5 +
 lib/social/ui-state.ts                             |  35 +++
 lib/state/useSocialDiscoveryStore.ts               |  17 +-
 package.json                                       |   1 +
 scripts/seed-social-discovery.ts                   |   5 +-
 tests/places/place-details-route.test.ts           | 155 +++++++++++++
 tests/social/marker-size.test.ts                   |  20 ++
 tests/social/ui-state.test.ts                      |  88 ++++++++
 19 files changed, 692 insertions(+), 147 deletions(-)
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
