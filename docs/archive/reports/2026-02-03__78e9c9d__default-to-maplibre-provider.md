# Learning Report: Default to MapLibre provider

- Date: 2026-02-03
- Commit: 78e9c9d0521efd44ccecc53beb7d6ccffa7a29e7
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "Default to MapLibre provider"

## What Changed
```
M	components/map/MapContainer.tsx
M	docs/PHASE_2_PLAN.md
M	docs/PLAYWRIGHT.md
```

## File Stats
```
 components/map/MapContainer.tsx | 2 +-
 docs/PHASE_2_PLAN.md            | 4 ++--
 docs/PLAYWRIGHT.md              | 6 +++---
 3 files changed, 6 insertions(+), 6 deletions(-)
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
