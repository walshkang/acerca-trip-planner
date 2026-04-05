# Learning Report: fix: align list local search with deterministic contract

- Date: 2026-02-01
- Commit: 82e202ff902e722f76b9495ee5d5a0011fbeca1a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: align list local search with deterministic contract"

## What Changed
```
M	app/api/places/local-search/route.ts
M	components/lists/ListDetailPanel.tsx
A	lib/places/local-search.ts
A	tests/e2e/list-local-search.spec.ts
A	tests/places/local-search.test.ts
```

## File Stats
```
 app/api/places/local-search/route.ts |  53 ++-------------
 components/lists/ListDetailPanel.tsx |  73 ++++++++------------
 lib/places/local-search.ts           |  44 ++++++++++++
 tests/e2e/list-local-search.spec.ts  |  73 ++++++++++++++++++++
 tests/places/local-search.test.ts    | 125 +++++++++++++++++++++++++++++++++++
 5 files changed, 276 insertions(+), 92 deletions(-)
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
