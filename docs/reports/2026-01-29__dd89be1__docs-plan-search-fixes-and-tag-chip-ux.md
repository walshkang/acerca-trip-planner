# Learning Report: docs: plan search fixes and tag chip UX

- Date: 2026-01-29
- Commit: dd89be1149b22e5aa70cd71df2675faf71923a5c
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: plan search fixes and tag chip UX"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md           | 4 +++-
 docs/PHASE_2_PLAN.md | 7 +++++--
 roadmap.json         | 4 +++-
 3 files changed, 11 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Documented the next P2-E3/P2-E4 refinements so search, tags, and overlay behavior stay aligned with user testing.
- Clarified local-search response contract and chip-based tag semantics to avoid regressions.

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
- Fix local search contract (keywords, deterministic ordering, nullable display_address).
- Implement chip-based tag editing with clear-all and explicit sync.
- Stabilize map camera on empty list selection and fix Omnibox layering via portal.
