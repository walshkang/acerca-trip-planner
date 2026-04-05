# Learning Report: test: seed lists and places for e2e

- Date: 2026-01-30
- Commit: b2b634f66beaa3b550819c97690ca486e1725ca4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: seed lists and places for e2e"

## What Changed
```
M	CONTEXT.md
A	app/api/test/seed/route.ts
M	docs/PLAYWRIGHT.md
A	lib/server/testSeed.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 CONTEXT.md                         |   2 +
 app/api/test/seed/route.ts         | 100 +++++++++++++++++++++++++++++++++++++
 docs/PLAYWRIGHT.md                 |   9 ++++
 lib/server/testSeed.ts             |  66 ++++++++++++++++++++++++
 tests/e2e/map-place-drawer.spec.ts |  74 +++++++++++++--------------
 5 files changed, 214 insertions(+), 37 deletions(-)
```

## Decisions / Rationale
- Added a guarded `/api/test/seed` endpoint that uses server-side seeding + promotion to remove conditional skips from Playwright.
- Seed flow mirrors production logic (candidate + enrichment + promote) while keeping data deterministic and fast.
- Updated Playwright specs to rely on seeded data instead of existing DB state.

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
- Set `PLAYWRIGHT_SEED_TOKEN` in the dev environment and re-run `npm run test:e2e`.
- Consider adding a cleanup route if seeded data volume becomes an issue.
