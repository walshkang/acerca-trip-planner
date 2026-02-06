# Learning Report: feat: replace place detail page with expandable drawer details

- Date: 2026-02-06
- Commit: 4894807863ea8918a67ed64c43785c05c6f167b4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: replace place detail page with expandable drawer details"

## What Changed
```
A	app/api/places/[id]/details/route.ts
M	app/candidates/page.tsx
M	app/places/[id]/page.tsx
M	components/places/PlaceDrawer.tsx
```

## File Stats
```
 app/api/places/[id]/details/route.ts | 106 +++++++++++++++
 app/candidates/page.tsx              |   3 +-
 app/places/[id]/page.tsx             | 236 +---------------------------------
 components/places/PlaceDrawer.tsx    | 241 ++++++++++++++++++++++++++++++++++-
 4 files changed, 347 insertions(+), 239 deletions(-)
```

## Decisions / Rationale
- Removed the “full details” navigation path in favor of an in-drawer “Show details” expander so users can reveal Wikipedia + stored Google details without leaving the map-first context.
- Added `GET /api/places/[id]/details` as a server-authenticated read path that returns a UI-safe subset of canonical place fields plus enrichment-derived details (curated Wikipedia + selected Google fields from frozen `raw_sources`).
- Converted `/places/[id]` into a redirect back to the map route (`/?place=<id>`) to preserve deep links while eliminating the separate detail surface.
- Tradeoff: details are now lazy-loaded and may require an extra request the first time the expander is opened; we keep payload intentionally small rather than returning the entire raw enrichment snapshot.

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
- Add a small “Preview”/“Approved” label in the Place surface when appropriate to reinforce truth boundaries.
- Consider persisting “details expanded” state in the URL (e.g. `&details=1`) if deep-linking expanded context becomes useful.
- If we later add more Google details, extend the server route to return explicit fields (keep client rendering deterministic; no raw JSON dumps).
