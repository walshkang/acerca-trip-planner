# Learning Report: Add learning report for 2026-01-27

- Date: 2026-01-27
- Commit: 80daca3082b0726b7d76a67ec6e2a1fdc6a24a97
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add learning report for 2026-01-27"

## What Changed
```
A	docs/reports/2026-01-27__82fad59__refactor-learning-report-to-improve-clarity-and-detail-on-data-processing-enhancements-and-backend-connection-best-practices.md
```

## File Stats
```
 ...ements-and-backend-connection-best-practices.md | 47 ++++++++++++++++++++++
 1 file changed, 47 insertions(+)
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
