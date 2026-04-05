# Learning Report: chore: update package.json scripts and enhance enums with exhaustive checks

- Date: 2026-01-27
- Commit: 93151490110c3a9f1c277926737c841e8864c9e4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: update package.json scripts and enhance enums with exhaustive checks"

## What Changed
```
A	CONTEXT.md
M	lib/server/enrichment/normalize.ts
M	lib/supabase/types.ts
M	lib/types/enums.ts
M	package.json
A	scripts/generate-context.ts
M	supabase/.temp/cli-latest
D	supabase/migrations/20240125000004b_add_enrichment_fkey.sql
A	supabase/migrations/20260127000005_add_place_candidates_enrichment_fkey.sql
M	tests/schema/enums.test.ts
```

## File Stats
```
 CONTEXT.md                                         |   39 +
 lib/server/enrichment/normalize.ts                 |    8 +-
 lib/supabase/types.ts                              | 1842 ++++++++++++++++++--
 lib/types/enums.ts                                 |   22 +
 package.json                                       |    4 +-
 scripts/generate-context.ts                        |  336 ++++
 supabase/.temp/cli-latest                          |    1 -
 .../20240125000004b_add_enrichment_fkey.sql        |    4 -
 ...000005_add_place_candidates_enrichment_fkey.sql |   16 +
 tests/schema/enums.test.ts                         |   23 +-
 10 files changed, 2163 insertions(+), 132 deletions(-)
```

## Decisions / Rationale
- Draft pending: capture rationale and tradeoffs in a follow-up pass.

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
- Draft pending: document follow-ups/risks in a follow-up pass.
