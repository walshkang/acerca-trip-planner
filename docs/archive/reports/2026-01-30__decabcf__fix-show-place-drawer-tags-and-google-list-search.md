# Learning Report: fix: show place drawer tags and google list search

- Date: 2026-01-30
- Commit: decabcfd3d9e080c50c21bb400ce4c550d9535e7
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: show place drawer tags and google list search"

## What Changed
```
M	CONTEXT.md
M	app/api/places/[id]/lists/route.ts
M	components/lists/ListDetailPanel.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
```

## File Stats
```
 CONTEXT.md                           |  2 +
 app/api/places/[id]/lists/route.ts   | 14 ++++--
 components/lists/ListDetailPanel.tsx | 98 +++++++++++++++++++++++-------------
 components/map/MapContainer.tsx      |  3 +-
 components/places/PlaceDrawer.tsx    | 66 +++++++++++++++++++++++-
 5 files changed, 144 insertions(+), 39 deletions(-)
```

## Decisions / Rationale
- Surface tags in the map place drawer by returning list-item tags and user tags alongside list membership, so map context shows tag info without navigating away.
- Switched list-detail search to the same Google Places flow as the Omnibox to match expected search behavior; ingest+promote runs before list assignment to preserve tag seeding.
- Raised the inspector layer above the place drawer to prevent overlap when opening results after selecting a list place.

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
- Manual QA: verify map place drawer shows tags (active list tags when set, else user tags), list search returns Google results and adds to list, and inspector stays visible above list-driven place drawer.
