# Learning Report: fix(rls): drop redundant list_items policy; ship sources-g card highlight

- Date: 2026-04-08
- Commit: b39f2dc41ffb7ffa33a84466a423d11d9b1bf2fd
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(rls): drop redundant list_items policy; ship sources-g card highlight"

## What Changed
```
M	CONTEXT.md
M	components/app/SourcesShellPaper.tsx
M	components/stitch/SourcesPanel.tsx
R100	cursor-prompts/sources-g-card-map-highlight.md	cursor-prompts/archive/sources-g-card-map-highlight.md
A	supabase/migrations/20260412000002_drop_redundant_list_items_policy.sql
```

## File Stats
```
 CONTEXT.md                                         |  2 +-
 components/app/SourcesShellPaper.tsx               | 10 +++-
 components/stitch/SourcesPanel.tsx                 | 53 ++++++++++++++++++++--
 .../{ => archive}/sources-g-card-map-highlight.md  |  0
 ...0412000002_drop_redundant_list_items_policy.sql |  5 ++
 5 files changed, 65 insertions(+), 5 deletions(-)
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
