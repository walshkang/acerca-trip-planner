# Learning Report: feat(discovery): remove social source links and add ratings + directions in previews

- Date: 2026-04-08
- Commit: d271cb4bb341362efe6a106ece536fc2732f597d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(discovery): remove social source links and add ratings + directions in previews"

## What Changed
```
M	CONTEXT.md
M	app/api/places/ingest/route.ts
M	components/stitch/InspectorCard.tsx
M	components/stitch/PlaceDrawer.tsx
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 CONTEXT.md                          |  4 ++--
 app/api/places/ingest/route.ts      |  5 +++++
 components/stitch/InspectorCard.tsx | 28 ++++++++++++++++++++++++++++
 components/stitch/PlaceDrawer.tsx   | 13 +++++++++++++
 lib/state/useDiscoveryStore.ts      |  2 ++
 5 files changed, 50 insertions(+), 2 deletions(-)
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
