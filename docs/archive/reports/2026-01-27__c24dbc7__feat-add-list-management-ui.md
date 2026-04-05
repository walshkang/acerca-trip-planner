# Learning Report: feat: add list management UI

- Date: 2026-01-27
- Commit: c24dbc7d4d659bc5fec2d85d2635acebc10b5618
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add list management UI"

## What Changed
```
A	app/api/lists/[id]/route.ts
A	app/api/lists/route.ts
A	app/lists/page.tsx
M	components/discovery/InspectorCard.tsx
A	components/lists/ListsPanel.tsx
```

## File Stats
```
 app/api/lists/[id]/route.ts            |  46 ++++++++++
 app/api/lists/route.ts                 | 118 ++++++++++++++++++++++++
 app/lists/page.tsx                     |  32 +++++++
 components/discovery/InspectorCard.tsx | 128 +++++++++++++++++++++++++-
 components/lists/ListsPanel.tsx        | 159 +++++++++++++++++++++++++++++++++
 5 files changed, 482 insertions(+), 1 deletion(-)
```

## Decisions / Rationale
- Added list CRUD APIs and a lightweight /lists page to keep list persistence server-backed and minimal.
- Ensured a default “Saved” list on fetch to remove empty-state friction without enforcing name uniqueness.
- Added list selection + quick-create in the Inspector to support assignment flow ahead of promotion wiring.

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
- Extend promote RPC and /api/places/promote to accept list_id and insert list_items atomically.
- Surface list membership on place detail and add assignment UI after approval.
