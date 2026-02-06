# Learning Report: docs: clarify Phase 2 slot planner constraints

- Date: 2026-02-06
- Commit: 569a35cd73b139cb818a2dce222b94ee045bd28d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: clarify Phase 2 slot planner constraints"

## What Changed
```
M	docs/PHASE_2_KANBAN_SPEC.md
M	docs/PHASE_2_PLAN.md
M	roadmap.json
```

## File Stats
```
 docs/PHASE_2_KANBAN_SPEC.md | 6 +++---
 docs/PHASE_2_PLAN.md        | 2 +-
 roadmap.json                | 4 ++++
 3 files changed, 8 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Tightened the spec/plan/roadmap alignment so P2-E1 implementation can’t drift on core determinism choices (ordering scope, slot encoding guardrails, and “no trip dates” behavior).
- Chose a single MVP behavior when trip dates are unset: render Backlog + Done only and disable day scheduling until dates are set; tradeoff is an extra upfront step, but it avoids inventing “pick a day on drop” UX and keeps scheduling deterministic.
- Documented the `scheduled_start_time` sentinel guardrail explicitly to prevent later misuse as a user-intended time-of-day.

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
- Implement the `Drinks` category end-to-end (enum migration, types regen, icon mapping, and normalization updates so bars map to Drinks).
- Build the scheduling write path (`PATCH /api/lists/[id]/items/[itemId]`) and enforce “scheduling fields only” updates + audit fields.
- Add the map ContextPanel `Plan` mode with slot lanes and deterministic ordering; cover with Playwright for schedule/reorder/Done/Backlog transitions.
