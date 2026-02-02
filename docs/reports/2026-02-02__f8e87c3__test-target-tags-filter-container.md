# Learning Report: test: target tags filter container

- Date: 2026-02-02
- Commit: f8e87c3a467d452175c23fa168cfa7699b16d2f0
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: target tags filter container"

## What Changed
```
M	tests/e2e/list-filters-and-map-link.spec.ts
```

## File Stats
```
 tests/e2e/list-filters-and-map-link.spec.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
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
