# Learning Report: feat: add list filters and focused glow

- Date: 2026-02-02
- Commit: c4faf37da63bb7fe111663dc82dde1bea3bcd0cb
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add list filters and focused glow"

## What Changed
```
M	app/places/[id]/page.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
M	components/places/PlaceUserMetaForm.tsx
A	lib/lists/filters.ts
A	lib/ui/glow.ts
M	tailwind.config.ts
A	tests/lists/filters.test.ts
```

## File Stats
```
 app/places/[id]/page.tsx                |  24 ++--
 components/lists/ListDetailBody.tsx     | 208 +++++++++++++++++++++++++-------
 components/lists/ListDetailPanel.tsx    |  53 ++++++--
 components/lists/ListDrawer.tsx         |  51 ++++++--
 components/map/MapContainer.tsx         |  37 ++++--
 components/places/PlaceDrawer.tsx       |  26 ++--
 components/places/PlaceUserMetaForm.tsx |   3 +
 lib/lists/filters.ts                    |  55 +++++++++
 lib/ui/glow.ts                          |   5 +
 tailwind.config.ts                      |   1 +
 tests/lists/filters.test.ts             |  38 ++++++
 11 files changed, 410 insertions(+), 91 deletions(-)
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
