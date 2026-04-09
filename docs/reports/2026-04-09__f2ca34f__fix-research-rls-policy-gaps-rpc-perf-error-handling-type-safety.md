# Learning Report: fix(research): RLS policy gaps, RPC perf, error handling, type safety

- Date: 2026-04-09
- Commit: f2ca34f21231c82e47027dd53546af2fa1512065
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(research): RLS policy gaps, RPC perf, error handling, type safety"

## What Changed
```
M	app/api/lists/[id]/items/route.ts
M	components/stitch/ResearchTriagePanel.tsx
A	cursor-prompts/fix-items-social-place-scope.md
A	cursor-prompts/fix-research-types-tests.md
A	cursor-prompts/fix-rls-rpc-migration.md
A	cursor-prompts/fix-triage-panel-error-handling.md
M	lib/social/research-queries.ts
A	supabase/migrations/20260414000001_fix_research_rls_rpc.sql
A	tests/lists/list-items-post-route.test.ts
M	tests/research/research-queries.test.ts
```

## File Stats
```
 app/api/lists/[id]/items/route.ts                  |  38 +++-
 components/stitch/ResearchTriagePanel.tsx          |  19 +-
 cursor-prompts/fix-items-social-place-scope.md     | 122 +++++++++++++
 cursor-prompts/fix-research-types-tests.md         | 127 +++++++++++++
 cursor-prompts/fix-rls-rpc-migration.md            |  72 ++++++++
 cursor-prompts/fix-triage-panel-error-handling.md  |  64 +++++++
 lib/social/research-queries.ts                     |   5 +-
 .../20260414000001_fix_research_rls_rpc.sql        | 202 +++++++++++++++++++++
 tests/lists/list-items-post-route.test.ts          |  80 ++++++++
 tests/research/research-queries.test.ts            |  65 +++++++
 10 files changed, 789 insertions(+), 5 deletions(-)
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
