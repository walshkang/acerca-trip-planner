# Learning Report: feat(social): add eval harness/model split and ingest progress updates

- Date: 2026-04-07
- Commit: 820fec5b3fc8667d2971220e4c0fdbb747129a90
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(social): add eval harness/model split and ingest progress updates"

## What Changed
```
M	.env.example
M	CONTEXT.md
M	components/stitch/SocialUrlIngest.tsx
M	cursor-prompts/README.md
A	cursor-prompts/eval-2-deterministic-harness.md
A	cursor-prompts/eval-3-llm-judge.md
A	cursor-prompts/eval-4-runner.md
A	cursor-prompts/eval-5-pipeline-perf-progress.md
M	lib/server/social/ingest.ts
M	lib/server/social/process-ingest-job.ts
M	lib/supabase/types.ts
M	package.json
A	supabase/migrations/20260409000002_social_ingest_jobs_progress.sql
M	tests/e2e/map-place-drawer.spec.ts
A	tests/e2e/paper-shell-responsive.spec.ts
M	tests/e2e/social-url-ingest.spec.ts
D	tests/e2e/workspace-adaptive.spec.ts
A	tests/social/evals/README.md
A	tests/social/evals/deterministic.eval.ts
A	tests/social/evals/fixtures/firehose.json
A	tests/social/evals/fixtures/ghost-town.json
A	tests/social/evals/fixtures/happy-path.json
A	tests/social/evals/fixtures/index.ts
A	tests/social/evals/fixtures/negative-review.json
A	tests/social/evals/fixtures/tangent.json
A	tests/social/evals/judge.eval.ts
M	vitest.config.ts
```

## File Stats
```
 .env.example                                       |   6 +-
 CONTEXT.md                                         |   6 +-
 components/stitch/SocialUrlIngest.tsx              |  14 +-
 cursor-prompts/README.md                           |  11 +
 cursor-prompts/eval-2-deterministic-harness.md     | 166 ++++++++++++
 cursor-prompts/eval-3-llm-judge.md                 | 172 +++++++++++++
 cursor-prompts/eval-4-runner.md                    | 146 +++++++++++
 cursor-prompts/eval-5-pipeline-perf-progress.md    | 231 +++++++++++++++++
 lib/server/social/ingest.ts                        | 181 ++++++++------
 lib/server/social/process-ingest-job.ts            |  14 +-
 lib/supabase/types.ts                              |   3 +
 package.json                                       |   3 +
 .../20260409000002_social_ingest_jobs_progress.sql |   2 +
 tests/e2e/map-place-drawer.spec.ts                 | 278 +++------------------
 tests/e2e/paper-shell-responsive.spec.ts           |  79 ++++++
 tests/e2e/social-url-ingest.spec.ts                |  25 ++
 tests/e2e/workspace-adaptive.spec.ts               | 154 ------------
 tests/social/evals/README.md                       |  56 +++++
 tests/social/evals/deterministic.eval.ts           |  88 +++++++
 tests/social/evals/fixtures/firehose.json          | 179 +++++++++++++
 tests/social/evals/fixtures/ghost-town.json        |  13 +
 tests/social/evals/fixtures/happy-path.json        |  53 ++++
 tests/social/evals/fixtures/index.ts               |  21 ++
 tests/social/evals/fixtures/negative-review.json   |  46 ++++
 tests/social/evals/fixtures/tangent.json           |  25 ++
 tests/social/evals/judge.eval.ts                   | 106 ++++++++
 vitest.config.ts                                   |   4 +-
 27 files changed, 1605 insertions(+), 477 deletions(-)
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
