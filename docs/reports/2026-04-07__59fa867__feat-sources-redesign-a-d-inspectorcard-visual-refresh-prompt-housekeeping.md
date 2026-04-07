# Learning Report: feat: Sources redesign A–D, InspectorCard visual refresh, prompt housekeeping

- Date: 2026-04-07
- Commit: 59fa8670d9d9a236e097d14da279c1e152a529d3
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: Sources redesign A–D, InspectorCard visual refresh, prompt housekeeping"

## What Changed
```
M	AGENTS.md
M	CONTEXT.md
M	app/api/enrichment/ingest-social/__tests__/integration.test.ts
M	app/api/enrichment/user-sources/__tests__/route.test.ts
M	app/api/lists/import-from-sources/route.ts
M	components/app/ExploreShellPaper.tsx
M	components/app/PlannerShellPaper.tsx
M	components/app/SourcesShellPaper.tsx
M	components/paper/PaperHeader.tsx
M	components/stitch/InspectorCard.tsx
D	components/stitch/SourcesExportSheet.tsx
M	components/stitch/SourcesPanel.tsx
M	cursor-prompts/README.md
R070	prompts/agent_task.md	cursor-prompts/agent_task.md
R100	cursor-prompts/B-preview-api.md	cursor-prompts/archive/B-preview-api.md
R100	cursor-prompts/C-computed-fields.md	cursor-prompts/archive/C-computed-fields.md
R100	cursor-prompts/D-commit-api.md	cursor-prompts/archive/D-commit-api.md
R100	cursor-prompts/F-export-ui.md	cursor-prompts/archive/F-export-ui.md
R100	cursor-prompts/G-import-ui.md	cursor-prompts/archive/G-import-ui.md
R100	cursor-prompts/H-verification-gate.md	cursor-prompts/archive/H-verification-gate.md
R100	cursor-prompts/collab-async-sync.md	cursor-prompts/archive/collab-async-sync.md
R100	cursor-prompts/collab-share-ui.md	cursor-prompts/archive/collab-share-ui.md
R100	cursor-prompts/discover-drawer-cleanup.md	cursor-prompts/archive/discover-drawer-cleanup.md
R100	cursor-prompts/discover-map-settings.md	cursor-prompts/archive/discover-map-settings.md
R100	cursor-prompts/discover-place-cards.md	cursor-prompts/archive/discover-place-cards.md
R100	cursor-prompts/map-layer-persistence.md	cursor-prompts/archive/map-layer-persistence.md
R100	cursor-prompts/map-layer-toggle.md	cursor-prompts/archive/map-layer-toggle.md
R100	prompts/slice2-calendar-grid.md	cursor-prompts/archive/slice2-calendar-grid.md
R100	prompts/slice3-day-detail-and-drag.md	cursor-prompts/archive/slice3-day-detail-and-drag.md
R100	prompts/slice4-view-toggles.md	cursor-prompts/archive/slice4-view-toggles.md
R100	prompts/slice5-map-reposition-smart-dates.md	cursor-prompts/archive/slice5-map-reposition-smart-dates.md
R100	cursor-prompts/social-s1-schema.md	cursor-prompts/archive/social-s1-schema.md
R100	cursor-prompts/social-s2-extraction-contract.md	cursor-prompts/archive/social-s2-extraction-contract.md
R100	cursor-prompts/social-s2-ingestion-api.md	cursor-prompts/archive/social-s2-ingestion-api.md
R100	cursor-prompts/social-s3-query-rpc.md	cursor-prompts/archive/social-s3-query-rpc.md
R100	cursor-prompts/social-s3-rpc-wrapper.md	cursor-prompts/archive/social-s3-rpc-wrapper.md
R100	cursor-prompts/social-s3-seed-data.md	cursor-prompts/archive/social-s3-seed-data.md
R100	cursor-prompts/social-s4-drawer-mentions.md	cursor-prompts/archive/social-s4-drawer-mentions.md
R100	cursor-prompts/social-s4-map-markers.md	cursor-prompts/archive/social-s4-map-markers.md
R100	cursor-prompts/social-s4-persona-chips.md	cursor-prompts/archive/social-s4-persona-chips.md
R100	cursor-prompts/social-s4-store.md	cursor-prompts/archive/social-s4-store.md
R100	cursor-prompts/social-s5-fetch-content.md	cursor-prompts/archive/social-s5-fetch-content.md
R100	cursor-prompts/social-s5-ingest-ui.md	cursor-prompts/archive/social-s5-ingest-ui.md
R100	cursor-prompts/transit-subtle-styling.md	cursor-prompts/archive/transit-subtle-styling.md
A	cursor-prompts/e2e-test-rewrite.md
A	cursor-prompts/inspector-card-chip-refresh.md
M	cursor-prompts/sources-b-api-contract.md
M	cursor-prompts/sources-c-panel-ui.md
M	cursor-prompts/sources-d-desktop-shell-nav.md
M	lib/server/social/ingest.ts
M	lib/social/extraction-contract.ts
D	lib/social/sources-export-payload.ts
M	lib/social/user-sources-contract.ts
M	lib/state/useDiscoveryStore.ts
D	lib/state/useSourcesStore.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260409000001_social_mentions_tags_callouts_place_ratings.sql
A	supabase/migrations/20260409000002_list_user_social_sources_v2.sql
M	tests/discovery/store.test.ts
M	tests/social/extraction-contract.test.ts
```

## File Stats
```
 AGENTS.md                                          |   2 +-
 CONTEXT.md                                         |  26 +-
 .../ingest-social/__tests__/integration.test.ts    |   8 +
 .../user-sources/__tests__/route.test.ts           |  20 +-
 app/api/lists/import-from-sources/route.ts         |  13 +-
 components/app/ExploreShellPaper.tsx               |   1 +
 components/app/PlannerShellPaper.tsx               |   1 +
 components/app/SourcesShellPaper.tsx               | 119 +++++-
 components/paper/PaperHeader.tsx                   |   3 +-
 components/stitch/InspectorCard.tsx                | 129 +++----
 components/stitch/SourcesExportSheet.tsx           | 359 -------------------
 components/stitch/SourcesPanel.tsx                 | 397 ++++++++++-----------
 cursor-prompts/README.md                           |  49 +--
 {prompts => cursor-prompts}/agent_task.md          |   1 +
 cursor-prompts/{ => archive}/B-preview-api.md      |   0
 cursor-prompts/{ => archive}/C-computed-fields.md  |   0
 cursor-prompts/{ => archive}/D-commit-api.md       |   0
 cursor-prompts/{ => archive}/F-export-ui.md        |   0
 cursor-prompts/{ => archive}/G-import-ui.md        |   0
 .../{ => archive}/H-verification-gate.md           |   0
 cursor-prompts/{ => archive}/collab-async-sync.md  |   0
 cursor-prompts/{ => archive}/collab-share-ui.md    |   0
 .../{ => archive}/discover-drawer-cleanup.md       |   0
 .../{ => archive}/discover-map-settings.md         |   0
 .../{ => archive}/discover-place-cards.md          |   0
 .../{ => archive}/map-layer-persistence.md         |   0
 cursor-prompts/{ => archive}/map-layer-toggle.md   |   0
 .../archive}/slice2-calendar-grid.md               |   0
 .../archive}/slice3-day-detail-and-drag.md         |   0
 .../archive}/slice4-view-toggles.md                |   0
 .../archive}/slice5-map-reposition-smart-dates.md  |   0
 cursor-prompts/{ => archive}/social-s1-schema.md   |   0
 .../{ => archive}/social-s2-extraction-contract.md |   0
 .../{ => archive}/social-s2-ingestion-api.md       |   0
 .../{ => archive}/social-s3-query-rpc.md           |   0
 .../{ => archive}/social-s3-rpc-wrapper.md         |   0
 .../{ => archive}/social-s3-seed-data.md           |   0
 .../{ => archive}/social-s4-drawer-mentions.md     |   0
 .../{ => archive}/social-s4-map-markers.md         |   0
 .../{ => archive}/social-s4-persona-chips.md       |   0
 cursor-prompts/{ => archive}/social-s4-store.md    |   0
 .../{ => archive}/social-s5-fetch-content.md       |   0
 .../{ => archive}/social-s5-ingest-ui.md           |   0
 .../{ => archive}/transit-subtle-styling.md        |   0
 cursor-prompts/e2e-test-rewrite.md                 | 114 ++++++
 cursor-prompts/inspector-card-chip-refresh.md      | 114 ++++++
 cursor-prompts/sources-b-api-contract.md           |   3 +
 cursor-prompts/sources-c-panel-ui.md               |   3 +
 cursor-prompts/sources-d-desktop-shell-nav.md      |   3 +
 lib/server/social/ingest.ts                        |  28 +-
 lib/social/extraction-contract.ts                  |  10 +
 lib/social/sources-export-payload.ts               |  31 --
 lib/social/user-sources-contract.ts                |   6 +
 lib/state/useDiscoveryStore.ts                     |   8 +
 lib/state/useSourcesStore.ts                       |  90 -----
 lib/supabase/types.ts                              |  61 +++-
 ...social_mentions_tags_callouts_place_ratings.sql |  12 +
 .../20260409000002_list_user_social_sources_v2.sql |  69 ++++
 tests/discovery/store.test.ts                      |  16 +
 tests/social/extraction-contract.test.ts           |  39 ++
 60 files changed, 900 insertions(+), 835 deletions(-)
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
