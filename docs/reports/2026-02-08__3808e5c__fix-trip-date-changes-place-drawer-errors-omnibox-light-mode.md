# Learning Report: fix: trip date changes, place drawer errors, omnibox light mode

- Date: 2026-02-08
- Commit: 3808e5c5f38a860efb675d454a6d5b18c75dce9b
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: trip date changes, place drawer errors, omnibox light mode"

## What Changed
```
M	app/api/lists/[id]/route.ts
M	components/discovery/Omnibox.tsx
M	components/places/PlaceDrawer.tsx
A	docs/reports/2026-02-08__56e60e3__learning-report.md
```

## File Stats
```
 app/api/lists/[id]/route.ts                        | 24 ++++++++++
 components/discovery/Omnibox.tsx                   |  1 +
 components/places/PlaceDrawer.tsx                  | 12 ++++-
 .../2026-02-08__56e60e3__learning-report.md        | 55 ++++++++++++++++++++++
 4 files changed, 91 insertions(+), 1 deletion(-)
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
