# Learning Report: Pause Playwright seeding tooling

- Date: 2026-02-03
- Commit: 4252a5f7470fd50e20aa6cecc6840e17450b0b20
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Pause Playwright seeding tooling"

## What Changed
```
D	app/api/test/seed/route.ts
M	docs/PLAYWRIGHT.md
D	lib/server/testSeed.ts
D	scripts/generate-playwright-storage.ts
```

## File Stats
```
 app/api/test/seed/route.ts             | 100 -----------------------------
 docs/PLAYWRIGHT.md                     |  40 +++---------
 lib/server/testSeed.ts                 |  66 --------------------
 scripts/generate-playwright-storage.ts | 111 ---------------------------------
 4 files changed, 7 insertions(+), 310 deletions(-)
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
