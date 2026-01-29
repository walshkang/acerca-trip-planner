# Learning Report: feat: add list detail read path

- Date: 2026-01-29
- Commit: fca06d56721216e5f8bf0aa13271066ebd4391de
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add list detail read path"

## What Changed
```
A	app/api/lists/[id]/items/route.ts
A	app/lists/[id]/page.tsx
A	components/lists/ListDetailPanel.tsx
M	components/lists/ListsPanel.tsx
```

## File Stats
```
 app/api/lists/[id]/items/route.ts    |  72 ++++++++++++++
 app/lists/[id]/page.tsx              |  36 +++++++
 components/lists/ListDetailPanel.tsx | 177 +++++++++++++++++++++++++++++++++++
 components/lists/ListsPanel.tsx      |   7 +-
 4 files changed, 290 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Added a read-only list detail API + page to unlock Phase 2 planning without schema changes.
- Used a single joined query to avoid N+1 fetches and preserve deterministic ordering.

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
- Add scheduling write endpoints (composite updates) and drag-and-drop UI.
- Add list-scoped tag edits and tag filter chips.
