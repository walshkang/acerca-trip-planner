# Learning Report: test: add Playwright smoke tests

- Date: 2026-01-30
- Commit: bd94db95786be8269f364b524140cf8c8e0e19af
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: add Playwright smoke tests"

## What Changed
```
M	.gitignore
M	CONTEXT.md
M	components/lists/ListDrawer.tsx
M	components/map/MapContainer.tsx
M	components/places/PlaceDrawer.tsx
A	docs/PLAYWRIGHT.md
M	package-lock.json
M	package.json
A	playwright.config.ts
A	tests/e2e/map-place-drawer.spec.ts
```

## File Stats
```
 .gitignore                         |  4 ++
 CONTEXT.md                         |  2 +
 components/lists/ListDrawer.tsx    |  5 +-
 components/map/MapContainer.tsx    |  6 ++-
 components/places/PlaceDrawer.tsx  |  1 +
 docs/PLAYWRIGHT.md                 | 46 ++++++++++++++++++
 package-lock.json                  | 63 +++++++++++++++++++++++++
 package.json                       |  4 ++
 playwright.config.ts               | 21 +++++++++
 tests/e2e/map-place-drawer.spec.ts | 96 ++++++++++++++++++++++++++++++++++++++
 10 files changed, 246 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Added Playwright config, scripts, and smoke specs to validate map/place-drawer behavior without manual runs.
- Introduced stable `data-testid` hooks for overlay and drawer elements to make selectors robust.
- Documented the storage-state login flow to keep auth manual but repeatable.

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
- Run `npx playwright install`, create `playwright/.auth/user.json`, and execute `npm run test:e2e`.
- Expand smoke coverage once list data is reliably seeded (e.g., add a setup helper to ensure a list has items).
