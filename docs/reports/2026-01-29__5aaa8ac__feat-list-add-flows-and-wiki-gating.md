# Learning Report: feat: list add flows and wiki gating

- Date: 2026-01-29
- Commit: 5aaa8acae1b470cd5dce1b6aa632f70e41424b66
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: list add flows and wiki gating"

## What Changed
```
M	CONTEXT.md
M	app/api/lists/[id]/items/route.ts
A	app/api/places/local-search/route.ts
M	app/places/[id]/page.tsx
M	components/discovery/InspectorCard.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
```

## File Stats
```
 CONTEXT.md                             |   4 +-
 app/api/lists/[id]/items/route.ts      |  56 ++++++++-
 app/api/places/local-search/route.ts   |  85 +++++++++++++
 app/places/[id]/page.tsx               |  81 +++++++------
 components/discovery/InspectorCard.tsx |  31 ++++-
 components/lists/ListDetailPanel.tsx   | 213 ++++++++++++++++++++++++++++++---
 components/lists/ListDrawer.tsx        |  49 ++++++++
 7 files changed, 460 insertions(+), 59 deletions(-)
```

## Decisions / Rationale
- Added local canonical search to list detail so users can add saved places without leaving list context.
- Seeded list item tags at add time (union of enrichment tags + user input) to keep enrichment immutable while making tags editable.
- Gated Wikipedia summaries to Sights-only to reduce noise for restaurants while preserving curated data.

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
- Add test coverage for list add tag seeding/idempotency and local-search auth guard.
- Consider adding tag suggestions from existing list tags in the list add flow.
- Optionally expose place drawer URL state as part of P2-E4.
