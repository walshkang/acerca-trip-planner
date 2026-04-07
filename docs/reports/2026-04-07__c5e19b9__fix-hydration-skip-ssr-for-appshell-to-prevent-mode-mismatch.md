# Learning Report: fix(hydration): skip SSR for AppShell to prevent mode mismatch

- Date: 2026-04-07
- Commit: c5e19b9599fa11e9e36f09b91330001a36393b2a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(hydration): skip SSR for AppShell to prevent mode mismatch"

## What Changed
```
M	app/page.tsx
```

## File Stats
```
 app/page.tsx | 26 ++++++++++++--------------
 1 file changed, 12 insertions(+), 14 deletions(-)
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
