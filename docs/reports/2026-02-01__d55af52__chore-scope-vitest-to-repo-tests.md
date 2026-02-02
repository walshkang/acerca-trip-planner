# Learning Report: chore: scope vitest to repo tests

- Date: 2026-02-01
- Commit: d55af527c8db17b449b4c61d7d4ad661d07b8a9c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: scope vitest to repo tests"

## What Changed
```
M	vitest.config.ts
```

## File Stats
```
 vitest.config.ts | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
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
