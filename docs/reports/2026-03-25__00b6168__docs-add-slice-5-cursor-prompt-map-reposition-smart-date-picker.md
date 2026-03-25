# Learning Report: docs: add Slice 5 Cursor prompt — map reposition + smart date picker

- Date: 2026-03-25
- Commit: 00b61686cb1628d156601c132a1431a9fab7d4b2
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add Slice 5 Cursor prompt — map reposition + smart date picker"

## What Changed
```
A	prompts/slice5-map-reposition-smart-dates.md
```

## File Stats
```
 prompts/slice5-map-reposition-smart-dates.md | 156 +++++++++++++++++++++++++++
 1 file changed, 156 insertions(+)
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
