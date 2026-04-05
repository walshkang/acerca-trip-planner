# Learning Report: feat: drive map drawer from URL

- Date: 2026-02-02
- Commit: 5490e0304bcc95161bd4c148a92c0c31cb7ebd59
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: drive map drawer from URL"

## What Changed
```
M	CONTEXT.md
M	components/lists/ListDetailPanel.tsx
M	components/map/MapContainer.tsx
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 CONTEXT.md                                  | 10 ++++++
 components/lists/ListDetailPanel.tsx        |  2 +-
 components/map/MapContainer.tsx             | 54 +++++++++++++++++++++++------
 tests/e2e/list-filters-and-map-link.spec.ts |  3 ++
 tests/e2e/map-place-drawer.spec.ts          | 24 +++++++++++++
 5 files changed, 81 insertions(+), 12 deletions(-)
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
