# Learning Report: docs: reshape P3-E4 as model-agnostic headless planning API

- Date: 2026-03-25
- Commit: 140b5dca83fa34e40bc3112d74549c297e978a32
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: reshape P3-E4 as model-agnostic headless planning API"

## What Changed
```
A	cursor-prompts/B-preview-api.md
A	cursor-prompts/C-computed-fields.md
A	cursor-prompts/D-commit-api.md
A	cursor-prompts/F-export-ui.md
A	cursor-prompts/G-import-ui.md
A	cursor-prompts/H-verification-gate.md
A	cursor-prompts/README.md
A	docs/PHASE_3_LIST_INTERCHANGE.md
A	lib/import/contract.ts
M	roadmap.json
```

## File Stats
```
 cursor-prompts/B-preview-api.md       |  80 +++++++
 cursor-prompts/C-computed-fields.md   |  95 +++++++++
 cursor-prompts/D-commit-api.md        |  68 ++++++
 cursor-prompts/F-export-ui.md         |  72 +++++++
 cursor-prompts/G-import-ui.md         |  77 +++++++
 cursor-prompts/H-verification-gate.md | 122 +++++++++++
 cursor-prompts/README.md              |  16 ++
 docs/PHASE_3_LIST_INTERCHANGE.md      | 247 ++++++++++++++++++++++
 lib/import/contract.ts                | 387 ++++++++++++++++++++++++++++++++++
 roadmap.json                          | 267 ++++++++++++++++-------
 10 files changed, 1357 insertions(+), 74 deletions(-)
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
