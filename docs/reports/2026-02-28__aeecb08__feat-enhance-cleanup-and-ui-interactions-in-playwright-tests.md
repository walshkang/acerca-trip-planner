# Learning Report: feat: enhance cleanup and UI interactions in Playwright tests

- Date: 2026-02-28
- Commit: aeecb087e6929a5e674bb2075910447858124263
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: enhance cleanup and UI interactions in Playwright tests"

## What Changed
```
M	app/api/test/seed/route.ts
M	components/map/MapContainer.tsx
M	docs/PLAYWRIGHT.md
A	docs/reports/2026-02-26__47b7a3c__feat-add-discard-cleanup-for-discovery-previews.md
M	lib/server/discovery/suggest.ts
M	playwright.config.ts
A	tests/e2e/global-setup.ts
M	tests/e2e/list-filters-and-map-link.spec.ts
M	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 app/api/test/seed/route.ts                         | 90 ++++++++++++++++++++--
 components/map/MapContainer.tsx                    | 77 +++++++++++-------
 docs/PLAYWRIGHT.md                                 |  3 +-
 ...t-add-discard-cleanup-for-discovery-previews.md | 69 +++++++++++++++++
 lib/server/discovery/suggest.ts                    | 70 ++++++++++-------
 playwright.config.ts                               |  1 +
 tests/e2e/global-setup.ts                          | 40 ++++++++++
 tests/e2e/list-filters-and-map-link.spec.ts        |  2 +-
 tests/e2e/map-place-drawer.spec.ts                 | 10 +--
 9 files changed, 295 insertions(+), 67 deletions(-)
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
