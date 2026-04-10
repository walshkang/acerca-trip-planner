# Learning Report: research: research-list API wiring, fix route slug, add copy endpoint tests

- Date: 2026-04-10
- Commit: 0a01568b8f88c5d03e441c345c8ffcdf0876bfe9
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "research: research-list API wiring, fix route slug, add copy endpoint tests"

## What Changed
```
M	CONTEXT.md
M	DESIGN.md
A	app/api/lists/[id]/places/copy/route.ts
A	app/api/research-lists/[id]/route.ts
A	app/api/research-lists/[id]/sources/route.ts
A	app/api/research-lists/route.ts
A	mockup-research-list-fixtures.json
A	scripts/run-playwright-global-setup.ts
A	supabase/migrations/202604101417_create_research_tables.sql
```

## File Stats
```
 CONTEXT.md                                         |   3 +
 DESIGN.md                                          |  33 ++++++
 app/api/lists/[id]/places/copy/route.ts            | 111 +++++++++++++++++++
 app/api/research-lists/[id]/route.ts               | 119 +++++++++++++++++++++
 app/api/research-lists/[id]/sources/route.ts       | 116 ++++++++++++++++++++
 app/api/research-lists/route.ts                    |  64 +++++++++++
 mockup-research-list-fixtures.json                 |  30 ++++++
 scripts/run-playwright-global-setup.ts             |  11 ++
 .../202604101417_create_research_tables.sql        |  41 +++++++
 9 files changed, 528 insertions(+)
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
