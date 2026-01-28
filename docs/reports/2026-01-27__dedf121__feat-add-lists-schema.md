# Learning Report: feat: add lists schema

- Date: 2026-01-27
- Commit: dedf121d64dc5afe5c1b1eb7bc1ee75a6b1d9a08
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add lists schema"

## What Changed
```
M	lib/supabase/types.ts
A	supabase/migrations/20260128000001_create_lists.sql
```

## File Stats
```
 lib/supabase/types.ts                              | 73 ++++++++++++++++++++++
 .../migrations/20260128000001_create_lists.sql     | 69 ++++++++++++++++++++
 2 files changed, 142 insertions(+)
```

## Decisions / Rationale
- Added `lists` + `list_items` with RLS `EXISTS` checks to keep list ownership enforced and predictable.
- Introduced `is_default` with a partial unique index to support a single per-user “Saved” list without enforcing name uniqueness.
- Skipped ordering and per-item notes for now to keep the Cupcake phase minimal; sequencing will land in Phase 2.

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
- Add list CRUD APIs/UI and a default “Saved” list creation path.
- Extend promotion to accept an optional list id and insert `list_items` transactionally.
- Surface list membership on place detail view.
