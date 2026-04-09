# Learning Report: docs: add PRD.md, update AGENTS.md doc-sync rule, update CONTEXT.md

- Date: 2026-04-08
- Commit: 5ffa83dafe972439b34612f3454889e35a07bc07
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add PRD.md, update AGENTS.md doc-sync rule, update CONTEXT.md"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
A	PRD.md
M	components/app/SourcesShellPaper.tsx
M	cursor-prompts/sources-h-clean-map-list-overlay.md
```

## File Stats
```
 AGENTS.md                                          |  17 +++-
 CONTEXT.md                                         |  30 +++---
 PRD.md                                             | 113 +++++++++++++++++++++
 components/app/SourcesShellPaper.tsx               |   1 +
 cursor-prompts/sources-h-clean-map-list-overlay.md |   2 +
 5 files changed, 145 insertions(+), 18 deletions(-)
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
