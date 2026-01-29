# Learning Report: feat: add map-first list drawer and search bias

- Date: 2026-01-29
- Commit: c2abfd86fe497113e30b9e8994c4ddfbb5e3cead
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add map-first list drawer and search bias"

## What Changed
```
M	app/api/lists/route.ts
M	app/api/places/search/route.ts
A	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
A	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	lib/enrichment/sources.ts
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 app/api/lists/route.ts               |   3 +-
 app/api/places/search/route.ts       |  25 ++++-
 components/lists/ListDetailBody.tsx  | 164 ++++++++++++++++++++++++++++++
 components/lists/ListDetailPanel.tsx | 142 ++------------------------
 components/lists/ListDrawer.tsx      | 192 +++++++++++++++++++++++++++++++++++
 components/map/MapContainer.tsx      | 134 ++++++++++++++++++++++--
 lib/enrichment/sources.ts            |  25 ++++-
 lib/state/useDiscoveryStore.ts       |  20 +++-
 8 files changed, 557 insertions(+), 148 deletions(-)
```

## Decisions / Rationale
- Added a map-side list drawer so list workflows stay in the map context.
- Implemented Find Place location bias using the map view to improve relevance without extra API calls.
- Refactored list detail rendering into a presentational body to reuse across page + drawer.

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
- Add list-scoped scheduling writes and tag editing in the drawer.
- Consider adding a toggle for highlight-only vs filter-only pins when a list is active.
