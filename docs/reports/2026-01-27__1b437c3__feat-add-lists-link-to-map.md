# Learning Report: feat: add lists link to map

- Date: 2026-01-27
- Commit: 1b437c3d10546043c9616506d3a9926c69f9cf2a
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add lists link to map"

## What Changed
```
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/map/MapContainer.tsx | 10 +++++++++-
 1 file changed, 9 insertions(+), 1 deletion(-)
```

## Decisions / Rationale
- Added a lightweight “Lists” link under the Omnibox so list management is discoverable without adding global navigation.

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
- Consider adding list management to a header/nav if we introduce more top-level pages.
