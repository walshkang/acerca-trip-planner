# Learning Report: learning scripts added to the project

- Date: 2026-01-26
- Commit: a40f7d278ff4dec257338a9d53869227786a78de
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "learning scripts added to the project"

## What Changed
```
A	scripts/generate-learning-report.sh
```

## File Stats
```
 scripts/generate-learning-report.sh | 83 +++++++++++++++++++++++++++++++++++++
 1 file changed, 83 insertions(+)
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
