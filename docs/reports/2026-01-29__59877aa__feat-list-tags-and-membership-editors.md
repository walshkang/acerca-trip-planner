# Learning Report: feat: list tags and membership editors

- Date: 2026-01-29
- Commit: 59877aa9115a5fdd3abdefb2dc59a48a8ad38cf9
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: list tags and membership editors"

## What Changed
```
M	CONTEXT.md
A	app/api/lists/[id]/items/[itemId]/tags/route.ts
M	app/api/lists/[id]/items/route.ts
A	app/api/lists/[id]/tags/route.ts
A	app/api/places/[id]/lists/route.ts
M	app/places/[id]/page.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
A	components/places/PlaceDrawer.tsx
A	components/places/PlaceListMembershipEditor.tsx
A	docs/reports/2026-01-29__4720c7c__feat-list-workspace-tags-filters.md
A	docs/reports/2026-01-29__4720c7c__feat-map-place-drawer-membership.md
A	docs/reports/2026-01-29__4720c7c__feat-place-detail-list-membership-editor.md
A	lib/lists/tags.ts
M	roadmap.json
A	tests/lists/tags.test.ts
```

## File Stats
```
 CONTEXT.md                                         |  12 +-
 app/api/lists/[id]/items/[itemId]/tags/route.ts    |  58 ++++++++
 app/api/lists/[id]/items/route.ts                  | 147 +++++++++++++++++++-
 app/api/lists/[id]/tags/route.ts                   |  52 +++++++
 app/api/places/[id]/lists/route.ts                 |  52 +++++++
 app/places/[id]/page.tsx                           |  25 ++--
 components/lists/ListDetailBody.tsx                | 122 +++++++++++++++-
 components/lists/ListDetailPanel.tsx               |  91 +++++++++++-
 components/lists/ListDrawer.tsx                    |  97 ++++++++++++-
 components/map/MapContainer.tsx                    |  31 ++++-
 components/places/PlaceDrawer.tsx                  | 102 ++++++++++++++
 components/places/PlaceListMembershipEditor.tsx    | 153 +++++++++++++++++++++
 ...9__4720c7c__feat-list-workspace-tags-filters.md |  66 +++++++++
 ...9__4720c7c__feat-map-place-drawer-membership.md |  40 ++++++
 ...7c__feat-place-detail-list-membership-editor.md |  45 ++++++
 lib/lists/tags.ts                                  |  81 +++++++++++
 roadmap.json                                       |   4 +-
 tests/lists/tags.test.ts                           |  50 +++++++
 18 files changed, 1194 insertions(+), 34 deletions(-)
```

## Decisions / Rationale
- Added list-scoped tag editing + filters to support P2-E3 without mutating frozen enrichment data.
- Centralized membership edits into idempotent add/remove routes and shared UI to keep map and list flows consistent.
- Introduced map-first place drawer membership editing to preserve the map as the primary interface.

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
- Add list creation and local search add-to-list from the list drawer / list detail view.
- Gate Wikipedia summaries to Sights-only in preview + detail views.
- Consider URL-driven state for the place drawer (P2-E4).
