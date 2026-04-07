# Learning Report: feat(social): Gemma support, eval improvements, self-improving prompt pipeline

- Date: 2026-04-07
- Commit: 897396447729d86a145eca3a84df93096a03d5f5
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(social): Gemma support, eval improvements, self-improving prompt pipeline"

## What Changed
```
M	.env.example
M	.gitignore
R093	cursor-prompts/eval-2-deterministic-harness.md	cursor-prompts/archive/eval-2-deterministic-harness.md
R093	cursor-prompts/eval-3-llm-judge.md	cursor-prompts/archive/eval-3-llm-judge.md
R090	cursor-prompts/eval-4-runner.md	cursor-prompts/archive/eval-4-runner.md
A	evals/scores/.gitkeep
A	lib/server/social/eval-judge.ts
M	lib/server/social/ingest.ts
M	lib/social/extraction-contract.ts
M	package.json
A	scripts/eval-capture.ts
A	scripts/eval-diagnose.ts
M	tests/social/evals/README.md
M	tests/social/evals/deterministic.eval.ts
M	tests/social/evals/fixtures/index.ts
A	tests/social/evals/fixtures/local-persona.json
A	tests/social/evals/fixtures/luxury-persona.json
M	tests/social/evals/judge.eval.ts
M	tests/social/extraction-contract.test.ts
```

## File Stats
```
 .env.example                                       |   3 +
 .gitignore                                         |   2 +
 .../{ => archive}/eval-2-deterministic-harness.md  |   6 +
 cursor-prompts/{ => archive}/eval-3-llm-judge.md   |   7 +
 cursor-prompts/{ => archive}/eval-4-runner.md      |   9 +-
 evals/scores/.gitkeep                              |   0
 lib/server/social/eval-judge.ts                    | 106 +++++++
 lib/server/social/ingest.ts                        | 318 +++++++++++++++++----
 lib/social/extraction-contract.ts                  |   2 +-
 package.json                                       |   4 +
 scripts/eval-capture.ts                            | 141 +++++++++
 scripts/eval-diagnose.ts                           | 190 ++++++++++++
 tests/social/evals/README.md                       |   7 +
 tests/social/evals/deterministic.eval.ts           |  35 ++-
 tests/social/evals/fixtures/index.ts               |   4 +
 tests/social/evals/fixtures/local-persona.json     |  45 +++
 tests/social/evals/fixtures/luxury-persona.json    |  53 ++++
 tests/social/evals/judge.eval.ts                   | 104 ++-----
 tests/social/extraction-contract.test.ts           | 112 +++++++-
 19 files changed, 1010 insertions(+), 138 deletions(-)
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
