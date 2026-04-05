# Learning Report: docs: update roadmap and context

- Date: 2026-02-02
- Commit: e606a915c2e59b98a178d0a6d5d200136b25fc98
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: update roadmap and context"

## What Changed
```
M	CONTEXT.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md   | 10 +++++++++-
 roadmap.json | 24 +++++++++++++++++++++++-
 2 files changed, 32 insertions(+), 2 deletions(-)
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
