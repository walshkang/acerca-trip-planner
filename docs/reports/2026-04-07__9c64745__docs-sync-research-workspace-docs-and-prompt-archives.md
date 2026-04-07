# Learning Report: docs: sync research workspace docs and prompt archives

- Date: 2026-04-07
- Commit: 9c64745aa52745882499d14edebdefa65d62cc22
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: sync research workspace docs and prompt archives"

## What Changed
```
M	CONTEXT.md
M	README.md
M	cursor-prompts/README.md
R100	cursor-prompts/e2e-test-rewrite.md	cursor-prompts/archive/e2e-test-rewrite.md
R100	cursor-prompts/eval-5-pipeline-perf-progress.md	cursor-prompts/archive/eval-5-pipeline-perf-progress.md
R100	cursor-prompts/inspector-card-chip-refresh.md	cursor-prompts/archive/inspector-card-chip-refresh.md
R100	cursor-prompts/sources-b-api-contract.md	cursor-prompts/archive/sources-b-api-contract.md
R100	cursor-prompts/sources-c-panel-ui.md	cursor-prompts/archive/sources-c-panel-ui.md
R100	cursor-prompts/sources-d-desktop-shell-nav.md	cursor-prompts/archive/sources-d-desktop-shell-nav.md
D	cursor-prompts/sources-a-schema-pipeline.md
M	docs/SOCIAL_DISCOVERY_PIPELINE.md
```

## File Stats
```
 CONTEXT.md                                         |  20 ++-
 README.md                                          |   2 +-
 cursor-prompts/README.md                           |  47 ++---
 cursor-prompts/{ => archive}/e2e-test-rewrite.md   |   0
 .../{ => archive}/eval-5-pipeline-perf-progress.md |   0
 .../{ => archive}/inspector-card-chip-refresh.md   |   0
 .../{ => archive}/sources-b-api-contract.md        |   0
 cursor-prompts/{ => archive}/sources-c-panel-ui.md |   0
 .../{ => archive}/sources-d-desktop-shell-nav.md   |   0
 cursor-prompts/sources-a-schema-pipeline.md        | 174 -------------------
 docs/SOCIAL_DISCOVERY_PIPELINE.md                  | 191 ++++++++++++++++-----
 11 files changed, 180 insertions(+), 254 deletions(-)
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
