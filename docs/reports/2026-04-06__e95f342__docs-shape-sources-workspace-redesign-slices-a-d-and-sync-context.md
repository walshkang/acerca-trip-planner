# Learning Report: docs: shape Sources workspace redesign (slices A–D) and sync context

- Date: 2026-04-06
- Commit: e95f342d50d6a1bf42aa6b53504db906b8b26f83
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: shape Sources workspace redesign (slices A–D) and sync context"

## What Changed
```
M	CONTEXT.md
M	cursor-prompts/README.md
A	cursor-prompts/sources-a-schema-pipeline.md
A	cursor-prompts/sources-b-api-contract.md
A	cursor-prompts/sources-c-panel-ui.md
A	cursor-prompts/sources-d-desktop-shell-nav.md
```

## File Stats
```
 CONTEXT.md                                    |  39 ++++--
 cursor-prompts/README.md                      |  13 ++
 cursor-prompts/sources-a-schema-pipeline.md   | 174 ++++++++++++++++++++++++++
 cursor-prompts/sources-b-api-contract.md      | 160 +++++++++++++++++++++++
 cursor-prompts/sources-c-panel-ui.md          | 134 ++++++++++++++++++++
 cursor-prompts/sources-d-desktop-shell-nav.md | 131 +++++++++++++++++++
 6 files changed, 638 insertions(+), 13 deletions(-)
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
