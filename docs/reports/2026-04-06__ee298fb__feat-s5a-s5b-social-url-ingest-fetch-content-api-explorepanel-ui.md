# Learning Report: feat: S5a/S5b — social URL ingest (fetch-content API + ExplorePanel UI)

- Date: 2026-04-06
- Commit: ee298fbfc133a71883a16c200d9f85c2b44ffbdb
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: S5a/S5b — social URL ingest (fetch-content API + ExplorePanel UI)"

## What Changed
```
M	.env.example
M	CONTEXT.md
A	app/api/enrichment/fetch-content/route.ts
M	app/api/enrichment/ingest-social/route.ts
A	app/api/test/auth/route.ts
M	components/paper/PaperExplorePanel.tsx
A	components/stitch/SocialUrlIngest.tsx
M	cursor-prompts/README.md
A	cursor-prompts/social-s5-fetch-content.md
A	cursor-prompts/social-s5-ingest-ui.md
M	lib/beta-access/decide.ts
A	lib/server/social/fetch-content.ts
M	package-lock.json
M	package.json
M	playwright.config.ts
M	tests/e2e/global-setup.ts
M	tests/e2e/seeded-helpers.ts
A	tests/e2e/social-url-ingest.spec.ts
A	tests/server/social/fetch-content.test.ts
```

## File Stats
```
 .env.example                              |  11 ++
 CONTEXT.md                                |  14 +-
 app/api/enrichment/fetch-content/route.ts |  24 ++++
 app/api/enrichment/ingest-social/route.ts |   2 +-
 app/api/test/auth/route.ts                |  68 +++++++++
 components/paper/PaperExplorePanel.tsx    |   3 +
 components/stitch/SocialUrlIngest.tsx     | 134 ++++++++++++++++++
 cursor-prompts/README.md                  |  13 +-
 cursor-prompts/social-s5-fetch-content.md | 225 ++++++++++++++++++++++++++++++
 cursor-prompts/social-s5-ingest-ui.md     | 195 ++++++++++++++++++++++++++
 lib/beta-access/decide.ts                 |   3 +
 lib/server/social/fetch-content.ts        | 138 ++++++++++++++++++
 package-lock.json                         | 143 +++++++++++++++++++
 package.json                              |   2 +
 playwright.config.ts                      |   4 +-
 tests/e2e/global-setup.ts                 | 102 +++++++++++++-
 tests/e2e/seeded-helpers.ts               |   4 +-
 tests/e2e/social-url-ingest.spec.ts       | 125 +++++++++++++++++
 tests/server/social/fetch-content.test.ts |  97 +++++++++++++
 19 files changed, 1292 insertions(+), 15 deletions(-)
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
