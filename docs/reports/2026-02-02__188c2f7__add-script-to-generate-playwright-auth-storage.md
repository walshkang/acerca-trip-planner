# Learning Report: Add script to generate Playwright auth storage

- Date: 2026-02-02
- Commit: 188c2f7b2e7e163a61e21e5e983ea1c69c366af9
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Add script to generate Playwright auth storage"

## What Changed
```
M	docs/PLAYWRIGHT.md
A	scripts/generate-playwright-storage.ts
```

## File Stats
```
 docs/PLAYWRIGHT.md                     |  22 +++++++
 scripts/generate-playwright-storage.ts | 111 +++++++++++++++++++++++++++++++++
 2 files changed, 133 insertions(+)
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
