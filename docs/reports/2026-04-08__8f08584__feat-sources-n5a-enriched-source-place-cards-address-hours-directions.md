# Learning Report: feat(sources): N5a — enriched source place cards (address, hours, directions)

- Date: 2026-04-08
- Commit: 8f08584139873eaa09c3643668528c331825834c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(sources): N5a — enriched source place cards (address, hours, directions)"

## What Changed
```
M	components/stitch/SourcesPanel.tsx
A	cursor-prompts/n5b-video-thumbnails.md
A	cursor-prompts/n5c-layout-rebalance.md
M	lib/social/user-sources-contract.ts
A	supabase/migrations/20260413000001_list_user_social_sources_v4.sql
```

## File Stats
```
 components/stitch/SourcesPanel.tsx                 |  64 +++++++--
 cursor-prompts/n5b-video-thumbnails.md             | 150 +++++++++++++++++++++
 cursor-prompts/n5c-layout-rebalance.md             | 104 ++++++++++++++
 lib/social/user-sources-contract.ts                |   2 +
 .../20260413000001_list_user_social_sources_v4.sql |  73 ++++++++++
 5 files changed, 383 insertions(+), 10 deletions(-)
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
