# Learning Report: feat: P3-E4 slices F/G/H — export/import UI, verification gate, discovery cleanup

- Date: 2026-03-25
- Commit: e4e5b88cceb7d62f4ebeb4dbf347f9695ec7deb8
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: P3-E4 slices F/G/H — export/import UI, verification gate, discovery cleanup"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/items/route.ts
A	app/api/places/[id]/route.ts
M	app/api/places/local-search/route.ts
M	app/api/places/promote/route.ts
M	components/app/ExploreShell.tsx
M	components/app/ExploreShellPaper.tsx
M	components/app/PlannerShellPaper.tsx
A	components/import/ImportAmbiguousPicker.tsx
A	components/import/ImportPreviewTable.tsx
A	components/import/ImportWizard.tsx
M	components/paper/PaperExplorePanel.tsx
M	components/stitch/InspectorCard.tsx
M	components/stitch/ListDetailBody.tsx
M	components/stitch/ListDetailPanel.tsx
M	components/stitch/ListDrawer.tsx
M	components/stitch/PlaceDrawer.tsx
M	docs/PHASE_3_LIST_INTERCHANGE.md
M	lib/export/contract.ts
A	lib/export/download-list-csv.ts
M	lib/export/resolve-export-rows.ts
M	lib/export/serialize-csv.ts
A	lib/import/client.ts
A	lib/import/parse-import-input.ts
A	lib/lists/list-item-seed-tags.ts
M	roadmap.json
M	tests/e2e/list-local-search.spec.ts
M	tests/export/serialize-csv.test.ts
M	tests/import/commit-api.test.ts
M	tests/import/compute.test.ts
M	tests/import/contract.test.ts
A	tests/import/parse-import-input.test.ts
A	tests/import/preview-api.test.ts
A	tests/lists/list-item-seed-tags.test.ts
A	tests/places/patch-place-route.test.ts
```

## File Stats
```
 CONTEXT.md                                  |  39 ++-
 app/api/lists/[id]/items/route.ts           |  37 +--
 app/api/places/[id]/route.ts                |  62 ++++
 app/api/places/local-search/route.ts        |  45 ++-
 app/api/places/promote/route.ts             |  15 +-
 components/app/ExploreShell.tsx             |   9 +
 components/app/ExploreShellPaper.tsx        |   8 +
 components/app/PlannerShellPaper.tsx        |  51 +++-
 components/import/ImportAmbiguousPicker.tsx |  44 +++
 components/import/ImportPreviewTable.tsx    | 235 +++++++++++++++
 components/import/ImportWizard.tsx          | 443 ++++++++++++++++++++++++++++
 components/paper/PaperExplorePanel.tsx      |   2 +-
 components/stitch/InspectorCard.tsx         | 309 ++++++++++++++-----
 components/stitch/ListDetailBody.tsx        | 103 ++++---
 components/stitch/ListDetailPanel.tsx       | 249 +++++++++++++++-
 components/stitch/ListDrawer.tsx            |  40 ++-
 components/stitch/PlaceDrawer.tsx           | 162 ++++++++--
 docs/PHASE_3_LIST_INTERCHANGE.md            |  13 +
 lib/export/contract.ts                      |   4 +
 lib/export/download-list-csv.ts             |  77 +++++
 lib/export/resolve-export-rows.ts           |   4 +
 lib/export/serialize-csv.ts                 |   6 +-
 lib/import/client.ts                        |  91 ++++++
 lib/import/parse-import-input.ts            | 327 ++++++++++++++++++++
 lib/lists/list-item-seed-tags.ts            |  36 +++
 roadmap.json                                |  24 +-
 tests/e2e/list-local-search.spec.ts         |   4 +
 tests/export/serialize-csv.test.ts          |  25 +-
 tests/import/commit-api.test.ts             | 324 ++++++++++++++++++++
 tests/import/compute.test.ts                |  85 +++++-
 tests/import/contract.test.ts               | 131 ++++++++
 tests/import/parse-import-input.test.ts     | 108 +++++++
 tests/import/preview-api.test.ts            | 249 ++++++++++++++++
 tests/lists/list-item-seed-tags.test.ts     |  27 ++
 tests/places/patch-place-route.test.ts      | 128 ++++++++
 35 files changed, 3279 insertions(+), 237 deletions(-)
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
