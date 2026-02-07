# Learning Report: docs: add planner implementation chunks

- Date: 2026-02-07
- Commit: 309ad496299c97738278c23e1a3d4529ab49ee8d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add planner implementation chunks"

## What Changed
```
M	docs/PHASE_2_KANBAN_SPEC.md
M	docs/PHASE_2_PLAN.md
```

## File Stats
```
 docs/PHASE_2_KANBAN_SPEC.md | 18 ++++++++++++++++++
 docs/PHASE_2_PLAN.md        | 36 ++++++++++++++++++++++++++++++++++++
 2 files changed, 54 insertions(+)
```

## Decisions / Rationale
- Added explicit implementation chunks (1: mobile tap-to-move, 2: desktop DnD + reorder, 3: mobile polish) to keep P2-E1 execution incremental and verifiable.
  - Rationale: de-risks the planner by shipping a usable mobile MVP first (no gesture conflicts) while keeping the backend contract stable for desktop follow-ups.
  - Rationale: makes it easier to scope tests and acceptance checks per slice (mobile move picker vs desktop DnD).
- Consolidated the chunk framing across both the epic plan (`docs/PHASE_2_PLAN.md`) and the concrete spec (`docs/PHASE_2_KANBAN_SPEC.md`).
  - Rationale: reduces ambiguity about what “done” means for each step and keeps implementation aligned with the surface model rules.
- Tradeoffs: chunk boundaries may shift once UI constraints and DnD ergonomics are validated in code; the docs will need periodic updates as the planner ships.

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
- Implement Chunk 1: add `PATCH /api/lists/[id]` (trip dates/timezone), add `PATCH /api/lists/[id]/items/[itemId]` (scheduling-only writes), and ship the mobile agenda + Move picker.
- Add unit/API/E2E coverage for mobile tap-to-move persistence and Done/Backlog transitions.
- Implement Chunk 2: desktop `Details | Plan` board + DnD + fractional ordering and desktop E2E coverage.
- Consider Chunk 3 polish once the core flows are stable (shortcuts + optional mobile reorder without introducing stacked drawers).
