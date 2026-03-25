# Learning Report: fix: lazy-init browser Supabase client for Vercel build

- Date: 2026-03-25
- Commit: ad2698281c827a36020ede35495b96d2352a9c8a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: lazy-init browser Supabase client for Vercel build"

## What Changed
```
M	app/auth/sign-in/page.tsx
M	components/app/PlannerShell.tsx
M	components/app/PlannerShellPaper.tsx
M	components/map/MapShell.tsx
M	lib/supabase/client.ts
M	lib/supabase/server.ts
```

## File Stats
```
 app/auth/sign-in/page.tsx            |  4 ++--
 components/app/PlannerShell.tsx      |  4 ++--
 components/app/PlannerShellPaper.tsx |  4 ++--
 components/map/MapShell.tsx          |  8 ++++----
 lib/supabase/client.ts               | 22 +++++++++++++++++++---
 lib/supabase/server.ts               | 12 ++++++++++--
 6 files changed, 39 insertions(+), 15 deletions(-)
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
