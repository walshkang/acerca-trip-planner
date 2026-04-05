# Learning Report: Add neighborhood lookup to place views and search

- Date: 2026-02-03
- Commit: d649a8ad16b3b7a2ad7c9fc8fdf8d7b830078248
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add neighborhood lookup to place views and search"

## What Changed
```
A	app/api/neighborhoods/lookup/route.ts
M	app/api/places/search/route.ts
M	app/places/[id]/page.tsx
M	components/discovery/Omnibox.tsx
M	components/places/PlaceDrawer.tsx
M	lib/enrichment/sources.ts
A	lib/geo/nycNeighborhoods.ts
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 app/api/neighborhoods/lookup/route.ts |  22 ++++++
 app/api/places/search/route.ts        |  24 ++++--
 app/places/[id]/page.tsx              |  13 +++-
 components/discovery/Omnibox.tsx      |   6 ++
 components/places/PlaceDrawer.tsx     |  59 +++++++++++++++
 lib/enrichment/sources.ts             |   8 +-
 lib/geo/nycNeighborhoods.ts           | 136 ++++++++++++++++++++++++++++++++++
 lib/state/useDiscoveryStore.ts        |   4 +
 8 files changed, 265 insertions(+), 7 deletions(-)
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
