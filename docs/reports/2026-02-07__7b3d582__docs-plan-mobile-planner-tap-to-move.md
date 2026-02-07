# Learning Report: docs: plan mobile planner tap-to-move

- Date: 2026-02-07
- Commit: 7b3d582e216fb16a79f611e6bf6e140f7c727146
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: plan mobile planner tap-to-move"

## What Changed
```
M	CONTEXT.md
M	docs/PHASE_2_KANBAN_SPEC.md
M	docs/PHASE_2_PLAN.md
M	docs/PHASE_2_UI_UX_REFACTOR_PLAN.md
M	docs/UX_RULES.md
```

## File Stats
```
 CONTEXT.md                          | 12 ++++++---
 docs/PHASE_2_KANBAN_SPEC.md         | 48 ++++++++++++++++++++++++++---------
 docs/PHASE_2_PLAN.md                | 50 +++++++++++++++++++++++++++++++------
 docs/PHASE_2_UI_UX_REFACTOR_PLAN.md |  8 ++++--
 docs/UX_RULES.md                    |  8 +++++-
 5 files changed, 99 insertions(+), 27 deletions(-)
```

## Decisions / Rationale
- Decided to ship the Phase 2 mobile planner as **tap-to-move (Move picker)** rather than drag-and-drop for the first chunk.
  - Rationale: keeps the mobile experience within the strict surface model (map + one overlay) and avoids a “window manager” feel from stacked drawers.
  - Rationale: reduces implementation risk for v1 (gesture conflicts, auto-scroll, and precision drop targets) while still enabling deterministic scheduling writes.
- Clarified mobile IA as **Context Panel modes** (e.g., `Places | Plan | Details`) and bottom tabs as a shell-level mode switch.
  - Rationale: matches Google Maps mental model (one canvas + one working surface) while preserving `?place=` URL state and predictable Back behavior.
- Added `tap_move` as a first-class `last_scheduled_source` value and updated test expectations.
  - Rationale: makes write provenance explicit and keeps audits distinguishable from desktop DnD (`drag`) and non-UI sources (`api`, `quick_add`).
- Tradeoffs: mobile v1 defers reordering UX (append-to-end insertion) and defers mobile DnD; these remain planned follow-ups.

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
- Implement `PATCH /api/lists/[id]` to set trip dates/timezone for enabling day buckets.
- Implement `PATCH /api/lists/[id]/items/[itemId]` (scheduling-only writes; `source="tap_move"` for mobile).
- Add `Plan` mode to the mobile Context Panel and render the agenda layout (Backlog → Days/Slots → Done).
- Add Move picker UI + optimistic updates + subtle motion; ensure `prefers-reduced-motion` is respected.
- Add unit + API + E2E coverage for mobile move flows; follow up with desktop DnD/reorder UX.
