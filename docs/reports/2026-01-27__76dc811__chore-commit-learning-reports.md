# Learning Report: chore: commit learning reports

- Date: 2026-01-27
- Commit: 76dc811bb83d36b68f3f40c963c8301fd5693514
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: commit learning reports"

## What Changed
```
M	README.md
M	docs/reports/2026-01-26__a40f7d2__learning-scripts-added-to-the-project.md
M	docs/reports/2026-01-26__aaf4f4c__implement-learning-scripts-for-enhanced-data-processing-and-analysis-capabilities.md
A	docs/reports/2026-01-27__04aca2e__feat-add-places-view-and-map-viewport-persistence.md
A	docs/reports/2026-01-27__06fca2b__chore-clarify-phase-1-gates-and-schema-notes.md
A	docs/reports/2026-01-27__08d5143__chore-add-agent-workflow-docs-and-rationale-guard.md
A	docs/reports/2026-01-27__11fb709__chore-enhance-context-md-with-detailed-roadmap-and-phase-information-and-add-tsx-dependency-to-package-lock-json.md
A	docs/reports/2026-01-27__18495e5__chore-update-roadmap-progress.md
A	docs/reports/2026-01-27__2c73044__fix-use-react-map-gl-mapbox-entrypoint.md
A	docs/reports/2026-01-27__36b45d8__updated-readme.md
M	docs/reports/2026-01-27__5929bfe__add-learning-report-for-enhanced-data-processing-and-analysis-capabilities-detailing-changes-and-best-practices-for-backend-connections.md
A	docs/reports/2026-01-27__7075b65__fix-promote-rpc-conflict-target-uses-partial-unique-index.md
M	docs/reports/2026-01-27__80daca3__add-learning-report-for-2026-01-27.md
M	docs/reports/2026-01-27__82fad59__refactor-learning-report-to-improve-clarity-and-detail-on-data-processing-enhancements-and-backend-connection-best-practices.md
A	docs/reports/2026-01-27__8997b76__fix-mermaid-gantt-generation-and-section-upserts.md
A	docs/reports/2026-01-27__9315149__chore-update-package-json-scripts-and-enhance-enums-with-exhaustive-checks.md
A	docs/reports/2026-01-27__9a26b9f__fix-cast-digest-input-for-dedupe-key.md
A	docs/reports/2026-01-27__9d548d9__feat-magic-link-auth-ingest-candidates-normalize-place-detail.md
A	docs/reports/2026-01-27__9e1e933__chore-add-phase-0-4-plan-to-roadmap.md
A	docs/reports/2026-01-27__b754c3d__chore-align-roadmap-with-airlock-strategy.md
A	docs/reports/2026-01-27__b97f231__chore-improve-context-generator-memory.md
A	docs/reports/2026-01-27__c0e7c86__chore-refine-phase-2-planning-timezone-strategy.md
A	docs/reports/2026-01-27__e1d391c__fix-parse-postgis-point-locations-for-map-pins.md
A	docs/reports/2026-01-27__e26fbb3__chore-update-roadmap-for-discovery-loop.md
A	docs/reports/2026-01-27__e4c4f71__feat-discovery-omnibox-curated-wiki-extraction.md
A	docs/reports/2026-01-27__f1d10fb__fix-resolve-pgcrypto-digest-via-extensions-schema.md
A	docs/reports/2026-01-27__f5bef29__clean-up-extensions-and-supabase-docs.md
A	docs/reports/2026-01-27__ff4b81f__add-generated-learning-report.md
```

## File Stats
```
 README.md                                          |  8 +-
 ...0f7d2__learning-scripts-added-to-the-project.md |  4 +-
 ...ed-data-processing-and-analysis-capabilities.md |  4 +-
 ...add-places-view-and-map-viewport-persistence.md | 55 ++++++++++++
 ...chore-clarify-phase-1-gates-and-schema-notes.md | 47 +++++++++++
 ...-add-agent-workflow-docs-and-rationale-guard.md | 61 ++++++++++++++
 ...-and-add-tsx-dependency-to-package-lock-json.md | 49 +++++++++++
 ...1-27__18495e5__chore-update-roadmap-progress.md | 47 +++++++++++
 ...3044__fix-use-react-map-gl-mapbox-entrypoint.md | 47 +++++++++++
 .../reports/2026-01-27__36b45d8__updated-readme.md | 47 +++++++++++
 ...s-and-best-practices-for-backend-connections.md |  4 +-
 ...pc-conflict-target-uses-partial-unique-index.md | 47 +++++++++++
 ..._80daca3__add-learning-report-for-2026-01-27.md |  4 +-
 ...ements-and-backend-connection-best-practices.md |  4 +-
 ...mermaid-gantt-generation-and-section-upserts.md | 49 +++++++++++
 ...pts-and-enhance-enums-with-exhaustive-checks.md | 65 +++++++++++++++
 ...a26b9f__fix-cast-digest-input-for-dedupe-key.md | 47 +++++++++++
 ...uth-ingest-candidates-normalize-place-detail.md | 77 +++++++++++++++++
 ...9e1e933__chore-add-phase-0-4-plan-to-roadmap.md | 55 ++++++++++++
 ...d__chore-align-roadmap-with-airlock-strategy.md | 47 +++++++++++
 ...f231__chore-improve-context-generator-memory.md | 49 +++++++++++
 ...re-refine-phase-2-planning-timezone-strategy.md | 53 ++++++++++++
 ...x-parse-postgis-point-locations-for-map-pins.md | 47 +++++++++++
 ...bb3__chore-update-roadmap-for-discovery-loop.md | 47 +++++++++++
 ...at-discovery-omnibox-curated-wiki-extraction.md | 97 ++++++++++++++++++++++
 ...esolve-pgcrypto-digest-via-extensions-schema.md | 47 +++++++++++
 ...bef29__clean-up-extensions-and-supabase-docs.md | 53 ++++++++++++
 ...1-27__ff4b81f__add-generated-learning-report.md | 47 +++++++++++
 28 files changed, 1194 insertions(+), 14 deletions(-)
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
