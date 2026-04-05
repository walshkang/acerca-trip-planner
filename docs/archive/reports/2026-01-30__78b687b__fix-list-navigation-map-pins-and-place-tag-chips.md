# Learning Report: fix: list navigation, map pins, and place tag chips

- Date: 2026-01-30
- Commit: 78b687be819706509f052a8f641a54742b238e22
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: list navigation, map pins, and place tag chips"

## What Changed
```
M	CONTEXT.md
M	app/api/places/local-search/route.ts
M	app/places/[id]/page.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceUserMetaForm.tsx
```

## File Stats
```
 CONTEXT.md                              |   2 +
 app/api/places/local-search/route.ts    |  44 ++++++++--
 app/places/[id]/page.tsx                |  12 +++
 components/lists/ListDetailBody.tsx     |  14 +++-
 components/lists/ListDetailPanel.tsx    |  16 ++++
 components/map/MapContainer.tsx         |  17 +++-
 components/places/PlaceUserMetaForm.tsx | 144 ++++++++++++++++++++++++++------
 7 files changed, 212 insertions(+), 37 deletions(-)
```

## Decisions / Rationale
- Added list title linking and list page navigation from list detail to address missing discoverability in the drawer.
- Stopped map click propagation for pin buttons so the place drawer opens reliably instead of being cleared by the map click handler.
- Expanded local-search matching to normalized fields and category matches to improve keyword discovery without schema changes.
- Updated place user tags to a chip editor with clear/remove affordances and surfaced tags in the header for faster scanability.

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
- Manual QA: verify map pin click opens drawer, list title links work in drawer and list detail, local-search returns matches for existing places, and place tag chips save/remove as expected.
- Consider adding a small empty-state hint when list items display fallback place tags to clarify list-scoped vs place-scoped tags.
