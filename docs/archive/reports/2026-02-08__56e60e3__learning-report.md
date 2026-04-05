# Learning Report: learning report

- Date: 2026-02-08
- Commit: 56e60e36dba8974fdcb4fc0014e6e7e0a5d11d7b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "learning report"

## What Changed
```
A	output/playwright/01-home.png
A	output/playwright/02-lists-open.png
A	output/playwright/03-list-selected.png
A	output/playwright/04-plan-mode.png
A	output/playwright/capture_plan_ui.js
```

## File Stats
```
 output/playwright/01-home.png          | Bin 0 -> 27816 bytes
 output/playwright/02-lists-open.png    | Bin 0 -> 222567 bytes
 output/playwright/03-list-selected.png | Bin 0 -> 511523 bytes
 output/playwright/04-plan-mode.png     | Bin 0 -> 686925 bytes
 output/playwright/capture_plan_ui.js   |  94 +++++++++++++++++++++++++++++++++
 5 files changed, 94 insertions(+)
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
