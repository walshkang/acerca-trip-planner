# Learning Report: fix: restore last active list panel on refresh

- Date: 2026-02-06
- Commit: 5e2dbda4ed6fdec7fc8fab38e328d8feeaa7fba2
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: restore last active list panel on refresh"

## What Changed
```
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/map/MapContainer.tsx | 7 ++++++-
 1 file changed, 6 insertions(+), 1 deletion(-)
```

## Decisions / Rationale
- On refresh, the app already persisted `acerca:lastActiveListId`, but it did not reopen the list context surface—so users would land on the map with no visible “last open” context.
- When we restore `lastActiveListId` from localStorage, we now also open the list panel (`drawerOpen=true`), set panel mode to Lists, and (if a `?place=` exists) pre-highlight that row in the list.
- Tradeoff: refresh will more aggressively open the list surface. If we want “remember last surface” instead of “prefer list”, we should persist a `lastPanelMode` and restore that instead.

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
- Consider persisting `acerca:lastPanelMode` so refresh restores the exact last surface (Lists vs Place), not always Lists.
