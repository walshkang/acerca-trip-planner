# Learning Report: feat: discovery omnibox + curated wiki extraction

- Date: 2026-01-27
- Commit: e4c4f717636d51c5f2fe465681024482dcae4058
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: discovery omnibox + curated wiki extraction"

## What Changed
```
M	SETUP.md
M	app/api/enrichment/route.ts
M	app/api/places/ingest/route.ts
M	app/auth/sign-in/page.tsx
A	app/candidates/page.tsx
A	app/ingest/page.tsx
M	app/places/[id]/page.tsx
A	components/discovery/GhostMarker.tsx
A	components/discovery/InspectorCard.tsx
A	components/discovery/Omnibox.tsx
A	components/ingest/CandidatesClient.tsx
A	components/ingest/IngestForm.tsx
M	components/map/MapContainer.tsx
M	lib/enrichment/contract.ts
A	lib/enrichment/curation.ts
M	lib/enrichment/sources.ts
A	lib/enrichment/wikiCurated.ts
M	lib/server/enrichment/normalize.ts
M	lib/server/places/getPlaceEnrichment.ts
A	lib/state/useDiscoveryStore.ts
M	lib/supabase/types.ts
M	lib/types/enums.ts
M	package.json
A	scripts/gen-db-types.sh
A	supabase/migrations/20260127000004_add_enrichments_curated_data.sql
A	tests/enrichment/wikiCurated.test.ts
```

## File Stats
```
 SETUP.md                                           |  16 +-
 app/api/enrichment/route.ts                        | 109 ++++++++++--
 app/api/places/ingest/route.ts                     |  76 ++++++++-
 app/auth/sign-in/page.tsx                          |  17 +-
 app/candidates/page.tsx                            |  66 +++++++
 app/ingest/page.tsx                                |  40 +++++
 app/places/[id]/page.tsx                           |  87 +++++++++-
 components/discovery/GhostMarker.tsx               |  25 +++
 components/discovery/InspectorCard.tsx             | 170 ++++++++++++++++++
 components/discovery/Omnibox.tsx                   |  58 +++++++
 components/ingest/CandidatesClient.tsx             | 108 ++++++++++++
 components/ingest/IngestForm.tsx                   |  87 ++++++++++
 components/map/MapContainer.tsx                    | 112 ++++++++----
 lib/enrichment/contract.ts                         |   2 +
 lib/enrichment/curation.ts                         |  87 ++++++++++
 lib/enrichment/sources.ts                          | 100 +++++++++++
 lib/enrichment/wikiCurated.ts                      |  77 +++++++++
 lib/server/enrichment/normalize.ts                 |   4 +
 lib/server/places/getPlaceEnrichment.ts            |   4 +-
 lib/state/useDiscoveryStore.ts                     |  96 +++++++++++
 lib/supabase/types.ts                              | 190 ++++++++++++++++++++-
 lib/types/enums.ts                                 |  14 +-
 package.json                                       |   1 +
 scripts/gen-db-types.sh                            |  19 +++
 ...20260127000004_add_enrichments_curated_data.sql |   7 +
 tests/enrichment/wikiCurated.test.ts               |  82 +++++++++
 26 files changed, 1579 insertions(+), 75 deletions(-)
```

## Decisions / Rationale
- Draft pending: capture rationale and tradeoffs in a follow-up pass.

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
- Draft pending: document follow-ups/risks in a follow-up pass.
