# Learning Report: feat: assign lists on approval

- Date: 2026-01-27
- Commit: 801d00d672e9dc475d40407cd731e9240bcc7e80
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: assign lists on approval"

## What Changed
```
M	app/api/places/promote/route.ts
M	app/places/[id]/page.tsx
M	components/discovery/InspectorCard.tsx
A	supabase/migrations/20260128000002_update_promote_rpc_list_assignment.sql
```

## File Stats
```
 app/api/places/promote/route.ts                    |   3 +-
 app/places/[id]/page.tsx                           |  34 +++
 components/discovery/InspectorCard.tsx             |   5 +-
 ...28000002_update_promote_rpc_list_assignment.sql | 241 +++++++++++++++++++++
 4 files changed, 281 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Extended the promotion RPC to accept an optional list id and to default to a per-user “Saved” list when none is provided.
- Kept assignment transactional inside the RPC so promotion and list membership stay atomic.
- Surfaced list membership on the place detail page to confirm assignment.

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
- Apply the migration on Supabase and regenerate DB types.
- Consider adding list membership editing from the place detail view.
