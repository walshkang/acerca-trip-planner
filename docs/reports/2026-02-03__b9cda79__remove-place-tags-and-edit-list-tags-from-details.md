# Learning Report: Remove place tags and edit list tags from details

- Date: 2026-02-03
- Commit: b9cda79010a6b5852aeb9c6be0504c90246eceb0
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Remove place tags and edit list tags from details"

## What Changed
```
M	app/api/lists/[id]/items/route.ts
M	app/api/places/[id]/lists/route.ts
M	app/places/[id]/page.tsx
M	components/lists/ListDetailBody.tsx
M	components/places/PlaceDrawer.tsx
A	components/places/PlaceListTagsEditor.tsx
M	components/places/PlaceUserMetaForm.tsx
```

## File Stats
```
 app/api/lists/[id]/items/route.ts         |  27 +++-
 app/api/places/[id]/lists/route.ts        |   3 +-
 app/places/[id]/page.tsx                  | 121 ++++-------------
 components/lists/ListDetailBody.tsx       |  21 ---
 components/places/PlaceDrawer.tsx         |  22 ----
 components/places/PlaceListTagsEditor.tsx | 207 ++++++++++++++++++++++++++++++
 components/places/PlaceUserMetaForm.tsx   | 130 +------------------
 7 files changed, 261 insertions(+), 270 deletions(-)
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
