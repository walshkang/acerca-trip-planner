# Learning Report: feat: add beta password gate for shared Vercel deploys

- Date: 2026-03-25
- Commit: 6f8840733296651e3908d0c4221031400d2ec030
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add beta password gate for shared Vercel deploys"

## What Changed
```
M	.env.example
A	app/api/beta-unlock/route.ts
A	app/beta/page.tsx
A	lib/beta-access/constant-time-bytes.ts
A	lib/beta-access/constants.ts
A	lib/beta-access/cookies.ts
A	lib/beta-access/decide.ts
A	lib/beta-access/index.ts
A	lib/beta-access/next-path.ts
A	lib/beta-access/timing-safe.ts
A	lib/beta-access/token.ts
A	middleware.ts
A	tests/beta-access/beta-access.test.ts
```

## File Stats
```
 .env.example                           |   9 ++
 app/api/beta-unlock/route.ts           |  50 +++++++
 app/beta/page.tsx                      | 105 +++++++++++++
 lib/beta-access/constant-time-bytes.ts |  12 ++
 lib/beta-access/constants.ts           |   8 +
 lib/beta-access/cookies.ts             |  21 +++
 lib/beta-access/decide.ts              |  64 ++++++++
 lib/beta-access/index.ts               |  10 ++
 lib/beta-access/next-path.ts           |  44 ++++++
 lib/beta-access/timing-safe.ts         |  33 +++++
 lib/beta-access/token.ts               | 138 +++++++++++++++++
 middleware.ts                          |  35 +++++
 tests/beta-access/beta-access.test.ts  | 262 +++++++++++++++++++++++++++++++++
 13 files changed, 791 insertions(+)
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
