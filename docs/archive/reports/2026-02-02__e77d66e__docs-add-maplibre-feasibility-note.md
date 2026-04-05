# Learning Report: docs: add maplibre feasibility note

- Date: 2026-02-02
- Commit: e77d66e00bf7ca340abfdbfa0e72f140b93235d4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add maplibre feasibility note"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_PLAN.md
A	docs/reports/2026-02-02__5490e03__feat-drive-map-drawer-from-url.md
A	docs/reports/2026-02-02__f524ac4__docs-update-phase-2-map-first-status.md
```

## File Stats
```
 CONTEXT.md                                         |  2 +-
 docs/PHASE_2_PLAN.md                               |  6 +++
 ...-02__5490e03__feat-drive-map-drawer-from-url.md | 55 ++++++++++++++++++++++
 ...524ac4__docs-update-phase-2-map-first-status.md | 49 +++++++++++++++++++
 4 files changed, 111 insertions(+), 1 deletion(-)
```

## Decisions / Rationale
- TODO: Add why these changes were made and any tradeoffs.

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
- TODO: List follow-ups or risks.
