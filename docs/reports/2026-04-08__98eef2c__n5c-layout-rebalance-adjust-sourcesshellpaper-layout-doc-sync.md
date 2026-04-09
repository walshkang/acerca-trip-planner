# Learning Report: N5c: layout rebalance — adjust SourcesShellPaper layout; doc sync

- Date: 2026-04-08
- Commit: 98eef2c4f6fc642388004888aecb79696113d05b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "N5c: layout rebalance — adjust SourcesShellPaper layout; doc sync"

## What Changed
```
M	CONTEXT.md
M	components/app/SourcesShellPaper.tsx
A	cursor-prompts/archive/n5c-layout-rebalance.md
M	cursor-prompts/n5c-layout-rebalance.md
```

## File Stats
```
 CONTEXT.md                                     |   2 +-
 components/app/SourcesShellPaper.tsx           |   4 +-
 cursor-prompts/archive/n5c-layout-rebalance.md | 104 +++++++++++++++++++++++++
 cursor-prompts/n5c-layout-rebalance.md         |   2 +-
 4 files changed, 108 insertions(+), 4 deletions(-)
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
