# Learning Report: docs: add map-first list context to roadmap

- Date: 2026-01-29
- Commit: cea5e151c999710a9d8d0bfd33df41b1a2e58e47
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add map-first list context to roadmap"

## What Changed
```
M	CONTEXT.md
M	IMPLEMENTATION.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md        |  4 ++++
 IMPLEMENTATION.md |  3 +++
 roadmap.json      | 12 +++++++++++-
 3 files changed, 18 insertions(+), 1 deletion(-)
```

## Decisions / Rationale
- Added a Phase 2 epic to keep the map as the primary interface while working in lists.
- Documented search bias + default view policy to avoid cross-geo confusion with distant list clusters.

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
- Implement list drawer overlay and active list highlighting on the map.
- Add location bias parameters to /api/places/search.
