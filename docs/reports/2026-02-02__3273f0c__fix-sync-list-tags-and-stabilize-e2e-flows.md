# Learning Report: fix: sync list tags and stabilize e2e flows

- Date: 2026-02-02
- Commit: 3273f0cf9f845f6ee84f923c34f18f126edaa6e7
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: sync list tags and stabilize e2e flows"

## What Changed
```
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
M	playwright.config.ts
M	tests/e2e/list-local-search.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 components/lists/ListDetailBody.tsx  |  5 +--
 components/lists/ListDetailPanel.tsx |  2 +-
 components/lists/ListDrawer.tsx      | 31 ++++++++++++-
 components/map/MapContainer.tsx      | 86 +++++++++++++++++++++++++++++++++---
 components/places/PlaceDrawer.tsx    | 40 ++++++++++++++---
 playwright.config.ts                 | 17 +++++++
 tests/e2e/list-local-search.spec.ts  | 10 +++--
 tests/e2e/map-place-drawer.spec.ts   | 58 +++++++++++++++++++-----
 8 files changed, 213 insertions(+), 36 deletions(-)
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
