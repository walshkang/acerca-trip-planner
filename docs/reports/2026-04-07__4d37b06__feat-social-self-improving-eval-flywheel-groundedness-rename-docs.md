# Learning Report: feat(social): self-improving eval flywheel + groundedness rename + docs

- Date: 2026-04-07
- Commit: 4d37b06240ede6ad1740cedd5919f4f8469b491b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(social): self-improving eval flywheel + groundedness rename + docs"

## What Changed
```
M	.gitignore
M	AGENTS.md
M	CONTEXT.md
M	README.md
A	evals/scores/2026-04-07T18-38-28.json
A	evals/scores/2026-04-07T18-54-15.json
A	evals/scores/README.md
A	evals/scores/latest-diagnosis.md
M	lib/beta-access/decide.ts
M	lib/server/social/eval-judge.ts
M	package.json
M	scripts/eval-capture.ts
M	scripts/eval-diagnose.ts
A	scripts/ingest-debug.ts
R100	supabase/migrations/20260409000002_social_ingest_jobs_progress.sql	supabase/migrations/20260409000003_social_ingest_jobs_progress.sql
M	tests/social/evals/judge.eval.ts
```

## File Stats
```
 .gitignore                                         |   3 +-
 AGENTS.md                                          |  27 ++++
 CONTEXT.md                                         |   2 +-
 README.md                                          |  33 +++++
 evals/scores/2026-04-07T18-38-28.json              |  96 ++++++++++++++
 evals/scores/2026-04-07T18-54-15.json              |  84 +++++++++++++
 evals/scores/README.md                             | 105 ++++++++++++++++
 evals/scores/latest-diagnosis.md                   |  42 +++++++
 lib/beta-access/decide.ts                          |   3 +
 lib/server/social/eval-judge.ts                    |  50 ++++++--
 package.json                                       |   1 +
 scripts/eval-capture.ts                            | 140 +++++++++++++--------
 scripts/eval-diagnose.ts                           |  28 +++--
 scripts/ingest-debug.ts                            |  92 ++++++++++++++
 ...20260409000003_social_ingest_jobs_progress.sql} |   0
 tests/social/evals/judge.eval.ts                   |  10 +-
 16 files changed, 628 insertions(+), 88 deletions(-)
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
