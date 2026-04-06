# Learning Report: feat: social discovery pipeline — S1-S3 schema, ingestion, query layer

- Date: 2026-04-06
- Commit: daae044e00ae4ca6310e12881900a46ef2cb9692
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: social discovery pipeline — S1-S3 schema, ingestion, query layer"

## What Changed
```
M	.env.example
A	app/api/enrichment/ingest-social/__tests__/extraction.test.ts
A	app/api/enrichment/ingest-social/__tests__/integration.test.ts
A	app/api/enrichment/ingest-social/route.ts
M	cursor-prompts/README.md
A	cursor-prompts/social-s1-schema.md
A	cursor-prompts/social-s2-extraction-contract.md
A	cursor-prompts/social-s2-ingestion-api.md
A	cursor-prompts/social-s3-query-rpc.md
A	cursor-prompts/social-s3-rpc-wrapper.md
A	cursor-prompts/social-s3-seed-data.md
A	cursor-prompts/social-s4-drawer-mentions.md
A	cursor-prompts/social-s4-map-markers.md
A	cursor-prompts/social-s4-persona-chips.md
A	cursor-prompts/social-s4-store.md
M	docs/SOCIAL_DISCOVERY_PIPELINE.md
A	lib/server/social/ingest.ts
A	lib/social/extraction-contract.ts
A	lib/social/queries.ts
M	lib/supabase/types.ts
M	package-lock.json
M	package.json
A	scripts/seed-social-discovery.ts
A	supabase/migrations/20260406000001_create_social_discovery_schema.sql
A	supabase/migrations/20260406000002_create_discover_social_places_rpc.sql
A	tests/setup-env.ts
A	tests/social/extraction-contract.test.ts
A	tests/social/queries.test.ts
M	vitest.config.ts
```

## File Stats
```
 .env.example                                       |   6 +
 .../ingest-social/__tests__/extraction.test.ts     |  63 ++++
 .../ingest-social/__tests__/integration.test.ts    | 212 ++++++++++++++
 app/api/enrichment/ingest-social/route.ts          |  19 ++
 cursor-prompts/README.md                           |  73 ++++-
 cursor-prompts/social-s1-schema.md                 | 116 ++++++++
 cursor-prompts/social-s2-extraction-contract.md    | 212 ++++++++++++++
 cursor-prompts/social-s2-ingestion-api.md          | 186 ++++++++++++
 cursor-prompts/social-s3-query-rpc.md              |  97 +++++++
 cursor-prompts/social-s3-rpc-wrapper.md            |  82 ++++++
 cursor-prompts/social-s3-seed-data.md              | 180 ++++++++++++
 cursor-prompts/social-s4-drawer-mentions.md        | 130 +++++++++
 cursor-prompts/social-s4-map-markers.md            | 112 +++++++
 cursor-prompts/social-s4-persona-chips.md          | 119 ++++++++
 cursor-prompts/social-s4-store.md                  | 129 ++++++++
 docs/SOCIAL_DISCOVERY_PIPELINE.md                  |  35 +++
 lib/server/social/ingest.ts                        | 238 +++++++++++++++
 lib/social/extraction-contract.ts                  |  85 ++++++
 lib/social/queries.ts                              |  54 ++++
 lib/supabase/types.ts                              | 323 ++++++++++++++-------
 package-lock.json                                  | 156 +++++++++-
 package.json                                       |   4 +
 scripts/seed-social-discovery.ts                   | 261 +++++++++++++++++
 ...260406000001_create_social_discovery_schema.sql |  76 +++++
 ...406000002_create_discover_social_places_rpc.sql |  53 ++++
 tests/setup-env.ts                                 |   3 +
 tests/social/extraction-contract.test.ts           |  81 ++++++
 tests/social/queries.test.ts                       |  61 ++++
 vitest.config.ts                                   |   6 +-
 29 files changed, 3050 insertions(+), 122 deletions(-)
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
