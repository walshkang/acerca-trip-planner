# Learning Report: chore: update roadmap and list assignment report

- Date: 2026-01-27
- Commit: b07c0be9ab766b27b99e2687f8d1be27ab982fe1
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: update roadmap and list assignment report"

## What Changed
```
A	docs/reports/2026-01-27__801d00d__feat-assign-lists-on-approval.md
M	roadmap.json
```

## File Stats
```
 ...1-27__801d00d__feat-assign-lists-on-approval.md | 56 ++++++++++++++++++++++
 roadmap.json                                       |  4 +-
 2 files changed, 58 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Updated roadmap to reflect list assignment completion and keep P1-E5 status accurate.
- Captured the list assignment report with concrete next steps.

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
- Apply the promote RPC migration on Supabase and regenerate types.
