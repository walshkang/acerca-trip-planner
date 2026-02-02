# Learning Report: feat: slate glass overlays and list tag persistence

- Date: 2026-02-02
- Commit: ebd72bb23ee4b8bbcf816742578da6f6013b3123
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: slate glass overlays and list tag persistence"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/items/route.ts
M	app/api/places/promote/route.ts
M	app/globals.css
M	app/places/[id]/page.tsx
M	components/discovery/InspectorCard.tsx
M	components/discovery/Omnibox.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
M	components/places/PlaceListMembershipEditor.tsx
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md                                      |   6 +-
 app/api/lists/[id]/items/route.ts               | 111 ++++++++++++++++++------
 app/api/places/promote/route.ts                 |  87 ++++++++++++++++++-
 app/globals.css                                 |  26 ++++++
 app/places/[id]/page.tsx                        |  54 ++++++++++--
 components/discovery/InspectorCard.tsx          |  79 +++++++++--------
 components/discovery/Omnibox.tsx                |  18 ++--
 components/lists/ListDetailBody.tsx             |  98 ++++++++++++++-------
 components/lists/ListDrawer.tsx                 |  33 +++----
 components/map/MapContainer.tsx                 |   4 +-
 components/places/PlaceDrawer.tsx               |  43 ++++-----
 components/places/PlaceListMembershipEditor.tsx |  25 ++++--
 docs/PHASE_2_PLAN.md                            |   6 ++
 roadmap.json                                    |   3 +-
 14 files changed, 433 insertions(+), 160 deletions(-)
```

## Decisions / Rationale
- Applied a Slate/Stone/Ice glass token layer to map overlays to ship the visual system without altering layout invariants (place drawer offset stays tied to inspector height).
- Persisted list-item tags on approve within the server promote flow and exposed list-item tags on /places/[id] so list-scoped tags are visible where users confirm approval.
- Added dark-tone variants to shared list/tag components to keep the map overlay UI legible without affecting non-map pages.

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
- Run the map drawer e2e spec to validate the no-overlap invariant.
- Verify list-item tags appear in /places/[id] after approve and in the list drawer after refresh.
- Start Track B window chrome (minimize/dock) once overlay visuals are stable.
