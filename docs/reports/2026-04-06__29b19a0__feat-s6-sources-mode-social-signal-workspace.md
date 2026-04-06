# Learning Report: feat: S6 — Sources mode (social signal workspace)

- Date: 2026-04-06
- Commit: 29b19a00970ef5abbcd599231880748a590de491
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: S6 — Sources mode (social signal workspace)"

## What Changed
```
A	app/api/enrichment/user-sources/__tests__/route.test.ts
A	app/api/enrichment/user-sources/route.ts
A	app/api/lists/import-from-sources/__tests__/route.test.ts
A	app/api/lists/import-from-sources/route.ts
M	components/app/AppShell.tsx
A	components/app/SourcesShellPaper.tsx
M	components/paper/PaperHeader.tsx
M	components/stitch/SocialUrlIngest.tsx
A	components/stitch/SourcesExportSheet.tsx
A	components/stitch/SourcesPanel.tsx
A	lib/social/sources-export-payload.ts
A	lib/social/user-sources-contract.ts
M	lib/state/useNavStore.ts
A	lib/state/useSourcesStore.ts
M	lib/supabase/types.ts
A	supabase/migrations/20260407000001_user_social_sources.sql
```

## File Stats
```
 .../user-sources/__tests__/route.test.ts           | 159 +++++++++
 app/api/enrichment/user-sources/route.ts           |  82 +++++
 .../import-from-sources/__tests__/route.test.ts    | 203 ++++++++++++
 app/api/lists/import-from-sources/route.ts         | 281 ++++++++++++++++
 components/app/AppShell.tsx                        |   7 +-
 components/app/SourcesShellPaper.tsx               |  30 ++
 components/paper/PaperHeader.tsx                   |  10 +-
 components/stitch/SocialUrlIngest.tsx              |  42 ++-
 components/stitch/SourcesExportSheet.tsx           | 359 +++++++++++++++++++++
 components/stitch/SourcesPanel.tsx                 | 340 +++++++++++++++++++
 lib/social/sources-export-payload.ts               |  31 ++
 lib/social/user-sources-contract.ts                |  28 ++
 lib/state/useNavStore.ts                           |   3 +-
 lib/state/useSourcesStore.ts                       |  90 ++++++
 lib/supabase/types.ts                              |  33 ++
 .../20260407000001_user_social_sources.sql         |  89 +++++
 16 files changed, 1775 insertions(+), 12 deletions(-)
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
