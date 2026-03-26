# Learning Report: chore: lock Playwright to Chromium on port 3010 and document guardrails

- Date: 2026-03-26
- Commit: f22c233da6ea5781e7f94868f085ec6f7f6bfaff
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: lock Playwright to Chromium on port 3010 and document guardrails"

## What Changed
```
M	AGENTS.md
M	playwright.config.ts
```

## File Stats
```
 AGENTS.md            | 9 ++++++++-
 playwright.config.ts | 5 ++++-
 2 files changed, 12 insertions(+), 2 deletions(-)
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
