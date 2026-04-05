# Learning Report: docs: tighten planner drift points

- Date: 2026-02-07
- Commit: 321d7638067bb9b991f4d8d31abf3fe3cb1d1180
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: tighten planner drift points"

## What Changed
```
M	docs/PHASE_2_KANBAN_SPEC.md
M	docs/PHASE_2_PLAN.md
M	docs/UX_RULES.md
M	docs/VIBE_PLAYBOOK.md
```

## File Stats
```
 docs/PHASE_2_KANBAN_SPEC.md | 26 +++++++++++++++++---------
 docs/PHASE_2_PLAN.md        |  5 +++++
 docs/UX_RULES.md            |  5 +++++
 docs/VIBE_PLAYBOOK.md       |  1 +
 4 files changed, 28 insertions(+), 9 deletions(-)
```

## Decisions / Rationale
- Tightened known “drift points” in the Phase 2 spec set so implementation stays deterministic as UI/UX complexity increases.
  - Added explicit desktop DnD constraints (no cross-category reordering; snap behavior) to prevent ambiguity around `scheduled_order`’s bucket definition.
  - Converted `Drinks` from a narrative dependency into a ship-safe checklist (migration → types → icons/exhaustive checks → normalization → backfill policy) to avoid half-shipped taxonomy changes.
  - Clarified Plan/Move picker as in-memory state (not URL-addressed) and defined Back/history expectations in `UX_RULES.md` to reduce “Back button madness.”
- Made the repo’s learning-report policy match reality by documenting that legacy reports may contain TODOs, while new/changed reports must be fully filled (and are enforced by the rationale checker script).
- Updated P2-E2 to explicitly preserve existing filter boolean semantics, reducing risk of a parallel “filter language” emerging.
Tradeoffs:
- Added a small amount of repetition across docs in exchange for clearer tie-breakers and less future interpretive drift.

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
- Implement Chunk 1 mobile planner MVP per `docs/PHASE_2_PLAN.md` (trip dates PATCH + scheduling PATCH + agenda + Move picker).
- When desktop DnD lands, ensure the UI drop targets match the “DnD constraints” section (reorder within category bucket only).
- When `Drinks` is implemented, follow the checklist to ensure enum/types/icons/normalization ship together.
