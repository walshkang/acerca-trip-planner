# Learning Report: docs: add Phase 2 slot planner spec

- Date: 2026-02-06
- Commit: 11879fdcfc7b87fd98eec399c04539d1b672d504
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add Phase 2 slot planner spec"

## What Changed
```
M	CONTEXT.md
A	docs/PHASE_2_KANBAN_SPEC.md
M	docs/PHASE_2_PLAN.md
```

## File Stats
```
 CONTEXT.md                  |  17 +++-
 docs/PHASE_2_KANBAN_SPEC.md | 191 ++++++++++++++++++++++++++++++++++++++++++++
 docs/PHASE_2_PLAN.md        |  25 ++++--
 3 files changed, 223 insertions(+), 10 deletions(-)
```

## Decisions / Rationale
- Wrote a concrete slot-planner spec so P2-E1 can ship as small, testable slices (API contract + deterministic UI rules) while keeping the map-first split context (list stays visible while planning).
- Chose slot-only scheduling (Morning/Afternoon/Evening) encoded as sentinel `scheduled_start_time` values to avoid schema churn and timezone complexity for MVP; tradeoff is we must later distinguish “slot label” from “real time” when adding precise times.
- Added the requirement for a first-class `Drinks` category so bars can be scheduled/filtered deterministically and grouped consistently; this implies a DB enum change + icon mapping updates and may require a versioned backfill strategy for existing “bar” places.

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
- Implement `Drinks` taxonomy end-to-end (enum migration, types regen, icon mapping, enrichment normalization updates).
- Add the scheduling write path (`PATCH /api/lists/[id]/items/[itemId]`) that updates scheduling fields + audit only.
- Build the map ContextPanel right-pane `Plan` mode with day buckets + three slots and drag-and-drop scheduling/reordering.
- Add Playwright coverage for slot scheduling + reorder + Done/Backlog transitions (seed includes at least one bar/Drinks place).
