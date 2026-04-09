# Learning Report: docs: add cursor prompts for N1, N2+N4, N3, N5a slices

- Date: 2026-04-08
- Commit: 56a547eec562ce826142a1545dde14c28916c02b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add cursor prompts for N1, N2+N4, N3, N5a slices"

## What Changed
```
A	cursor-prompts/n1-search-scope-fix.md
A	cursor-prompts/n2-n4-drawer-cleanup-richer-preview.md
A	cursor-prompts/n3-transit-loading-spinner.md
A	cursor-prompts/n5a-enriched-source-cards.md
```

## File Stats
```
 cursor-prompts/n1-search-scope-fix.md              |  77 ++++++++
 .../n2-n4-drawer-cleanup-richer-preview.md         | 152 +++++++++++++++
 cursor-prompts/n3-transit-loading-spinner.md       |  90 +++++++++
 cursor-prompts/n5a-enriched-source-cards.md        | 217 +++++++++++++++++++++
 4 files changed, 536 insertions(+)
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
