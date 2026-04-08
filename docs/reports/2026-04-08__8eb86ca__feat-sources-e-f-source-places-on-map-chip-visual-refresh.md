# Learning Report: feat(sources): E+F — source places on map + chip visual refresh

- Date: 2026-04-08
- Commit: 8eb86ca5cfe76de6c746b63c0ab94821380f3f3f
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat(sources): E+F — source places on map + chip visual refresh"

## What Changed
```
M	CONTEXT.md
M	app/globals.css
M	components/app/SourcesShellPaper.tsx
A	cursor-prompts/archive/sources-e-map-view.md
A	cursor-prompts/archive/sources-f-chip-style.md
M	lib/social/user-sources-contract.ts
A	supabase/migrations/20260411000001_list_user_social_sources_v3.sql
```

## File Stats
```
 CONTEXT.md                                         |   8 +-
 app/globals.css                                    |   9 +-
 components/app/SourcesShellPaper.tsx               |  44 ++------
 cursor-prompts/archive/sources-e-map-view.md       | 113 +++++++++++++++++++++
 cursor-prompts/archive/sources-f-chip-style.md     |  88 ++++++++++++++++
 lib/social/user-sources-contract.ts                |   2 +
 .../20260411000001_list_user_social_sources_v3.sql |  71 +++++++++++++
 7 files changed, 292 insertions(+), 43 deletions(-)
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
