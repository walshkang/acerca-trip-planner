# Learning Report: Unify place tags across detail and drawers

- Date: 2026-02-03
- Commit: 474c5bb79802e1b100988c20ee26410e86c28d35
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Unify place tags across detail and drawers"

## What Changed
```
M	app/places/[id]/page.tsx
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDrawer.tsx
M	components/places/PlaceDrawer.tsx
M	components/places/PlaceUserMetaForm.tsx
```

## File Stats
```
 app/places/[id]/page.tsx                | 191 +++++++++++++++-----------------
 components/lists/ListDetailBody.tsx     |  20 ++++
 components/lists/ListDrawer.tsx         |   5 +
 components/places/PlaceDrawer.tsx       |  14 ++-
 components/places/PlaceUserMetaForm.tsx |  51 ++++++---
 5 files changed, 160 insertions(+), 121 deletions(-)
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
