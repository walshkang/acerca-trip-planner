# Learning Report: fix: force-dynamic on pages using server Supabase client

- Date: 2026-03-25
- Commit: 1c85822034deedab70b8479dda95c793508a06ef
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: force-dynamic on pages using server Supabase client"

## What Changed
```
M	app/candidates/page.tsx
M	app/ingest/page.tsx
M	app/lists/[id]/page.tsx
M	app/lists/page.tsx
```

## File Stats
```
 app/candidates/page.tsx | 2 ++
 app/ingest/page.tsx     | 2 ++
 app/lists/[id]/page.tsx | 2 ++
 app/lists/page.tsx      | 2 ++
 4 files changed, 8 insertions(+)
```

## Decisions / Rationale
- Auto-generated from commit metadata. If this report is included in a PR, replace this line with concrete rationale and tradeoffs from the implementation.

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
- No follow-up actions were captured automatically.
