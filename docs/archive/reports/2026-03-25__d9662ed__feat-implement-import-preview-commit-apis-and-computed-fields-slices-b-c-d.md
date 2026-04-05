# Learning Report: feat: implement import preview/commit APIs and computed fields (slices B, C, D)

- Date: 2026-03-25
- Commit: d9662edf01f5926d36b26c426786f5c1c59b56a8
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: implement import preview/commit APIs and computed fields (slices B, C, D)"

## What Changed
```
A	app/api/lists/[id]/import/commit/route.ts
A	app/api/lists/[id]/import/preview/route.ts
M	app/api/places/ingest/route.ts
A	lib/import/commit-validation.ts
A	lib/import/compute.ts
M	lib/import/contract.ts
A	lib/import/map-google-place-to-resolved.ts
A	lib/import/preview-trip-summary.ts
A	lib/places/google-place-input.ts
A	lib/places/infer-category-from-google-types.ts
A	lib/server/places/ingest-google-place.ts
A	tests/import/commit-api.test.ts
A	tests/import/commit-validation.test.ts
A	tests/import/compute.test.ts
A	tests/import/contract.test.ts
A	tests/import/google-place-input.test.ts
A	tests/import/infer-category-google-types.test.ts
A	tests/import/preview-trip-summary.test.ts
M	tests/lists/calendar-day-detail.test.ts
A	tests/server/enrichment/google-review-stats.test.ts
```

## File Stats
```
 app/api/lists/[id]/import/commit/route.ts          | 513 +++++++++++++++++++++
 app/api/lists/[id]/import/preview/route.ts         | 202 ++++++++
 app/api/places/ingest/route.ts                     | 192 ++------
 lib/import/commit-validation.ts                    |  11 +
 lib/import/compute.ts                              | 426 +++++++++++++++++
 lib/import/contract.ts                             |  22 +-
 lib/import/map-google-place-to-resolved.ts         | 111 +++++
 lib/import/preview-trip-summary.ts                 |  12 +
 lib/places/google-place-input.ts                   |  22 +
 lib/places/infer-category-from-google-types.ts     |  42 ++
 lib/server/places/ingest-google-place.ts           | 211 +++++++++
 tests/import/commit-api.test.ts                    | 168 +++++++
 tests/import/commit-validation.test.ts             |  46 ++
 tests/import/compute.test.ts                       | 333 +++++++++++++
 tests/import/contract.test.ts                      | 145 ++++++
 tests/import/google-place-input.test.ts            |  51 ++
 tests/import/infer-category-google-types.test.ts   |  32 ++
 tests/import/preview-trip-summary.test.ts          | 107 +++++
 tests/lists/calendar-day-detail.test.ts            |   8 +
 .../server/enrichment/google-review-stats.test.ts  |  47 ++
 20 files changed, 2545 insertions(+), 156 deletions(-)
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
