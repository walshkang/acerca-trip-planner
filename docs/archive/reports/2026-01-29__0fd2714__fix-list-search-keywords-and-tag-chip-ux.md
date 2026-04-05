# Learning Report: fix: list search keywords and tag chip UX

- Date: 2026-01-29
- Commit: 0fd2714a754172507e89d11160cd1d82251cc224
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: list search keywords and tag chip UX"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/items/route.ts
M	app/api/places/local-search/route.ts
M	components/discovery/Omnibox.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
```

## File Stats
```
 CONTEXT.md                           |  2 +
 app/api/lists/[id]/items/route.ts    | 56 ++++++++++++--------
 app/api/places/local-search/route.ts | 52 +++++++++++++------
 components/discovery/Omnibox.tsx     | 99 ++++++++++++++++++++++++++----------
 components/lists/ListDetailBody.tsx  | 90 +++++++++++++++++++++++---------
 components/lists/ListDetailPanel.tsx | 18 +++----
 components/lists/ListDrawer.tsx      |  4 +-
 components/map/MapContainer.tsx      | 27 ++++++++--
 8 files changed, 244 insertions(+), 104 deletions(-)
```

## Decisions / Rationale
- Switched list local-search to keyword matching with deterministic ranking and optional category matching to fix the broken `places_view.address` query without adding schema changes.
- Rendered Omnibox results in a portal and raised overlay z-index so search results are not clipped by the list drawer.
- Reworked list-item tag editing into a single chip set with per-chip remove + clear-all; edits sync immediately and clearing persists empty tags.
- Prevented tag reseeding on duplicate list-item adds so user-cleared tags stay cleared, and added a map camera guard so empty-list selection does not move the view.
- Added a map-shell sign-out affordance to close the missing auth UX gap without altering the auth flow.

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
- Manual QA: create list (map static), keyword local search, add tags from list search, clear all tags, verify tags persist on refresh, verify Omnibox results over drawer, verify sign-out.
- Consider lightweight API/component tests for list local-search contract and tag-clear behavior if regressions appear.
