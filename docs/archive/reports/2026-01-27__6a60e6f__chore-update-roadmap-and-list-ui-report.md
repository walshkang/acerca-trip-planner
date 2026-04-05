# Learning Report: chore: update roadmap and list UI report

- Date: 2026-01-27
- Commit: 6a60e6fcf130688c01897b3d59480f025319cbcc
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: update roadmap and list UI report"

## What Changed
```
A	docs/reports/2026-01-27__c24dbc7__feat-add-list-management-ui.md
M	roadmap.json
```

## File Stats
```
 ...-01-27__c24dbc7__feat-add-list-management-ui.md | 58 ++++++++++++++++++++++
 roadmap.json                                       |  4 +-
 2 files changed, 60 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Updated roadmap to reflect list UI completion and keep P1-E5 gating criteria current.
- Captured the list UI report with explicit next steps to align follow-on work.

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
- Add list assignment during promotion and show membership on the place detail page.
