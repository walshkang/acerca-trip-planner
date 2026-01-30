# Learning Report: fix: edit list tags in place drawer

- Date: 2026-01-30
- Commit: 53efacef1f7d0d8214c07f4f000690cd57337aed
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: edit list tags in place drawer"

## What Changed
```
M	CONTEXT.md
M	app/api/places/[id]/lists/route.ts
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
M	components/places/PlaceListMembershipEditor.tsx
```

## File Stats
```
 CONTEXT.md                                      |   2 +
 app/api/places/[id]/lists/route.ts              |   3 +-
 components/map/MapContainer.tsx                 |  48 +++--
 components/places/PlaceDrawer.tsx               | 229 ++++++++++++++++++------
 components/places/PlaceListMembershipEditor.tsx |   4 +
 5 files changed, 219 insertions(+), 67 deletions(-)
```

## Decisions / Rationale
- Added list-item IDs to the place→lists response so the place drawer can edit list-scoped tags directly.
- Implemented editable tag chips inside the place drawer (active list only) to make map context editing possible without navigating away.
- Positioned the place drawer below the inspector overlay by measuring the right-hand overlay height.

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
- Manual QA: open a map pin, edit list tags in the drawer, and confirm they persist in the list view; verify the drawer stays below the inspector.
