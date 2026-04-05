# Learning Report: feat: add list scheduling and tags schema

- Date: 2026-01-29
- Commit: 1be97c37fa9f70cb31b487d113c018ab8b7a341f
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add list scheduling and tags schema"

## What Changed
```
A	supabase/migrations/20260128000003_add_list_scheduling_and_tags.sql
```

## File Stats
```
 ...20260128000003_add_list_scheduling_and_tags.sql | 26 ++++++++++++++++++++++
 1 file changed, 26 insertions(+)
```

## Decisions / Rationale
- Added scheduling fields to list_items to support Phase 2 kanban planning without mutating places.
- Chose fractional ordering to avoid large reindex updates on drag-and-drop.
- Added list-scoped tags to keep tagging tied to a list context.

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
- Apply the migration to the Supabase project and regenerate types.
- Add API routes for list item scheduling and tag updates.
