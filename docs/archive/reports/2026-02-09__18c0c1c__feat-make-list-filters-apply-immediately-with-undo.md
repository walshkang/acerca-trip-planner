# Learning Report: feat: make list filters apply immediately with undo

- Date: 2026-02-09
- Commit: 18c0c1cd32875f5370c94e9a655a00dc29b3e1d4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: make list filters apply immediately with undo"

## What Changed
```
M	CONTEXT.md
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
A	lib/lists/filter-client.ts
A	tests/lists/filter-client.test.ts
```

## File Stats
```
 CONTEXT.md                           |   7 +-
 components/lists/ListDetailBody.tsx  |  12 +-
 components/lists/ListDetailPanel.tsx | 612 +++++++++++++++++++++++++++++------
 components/lists/ListDrawer.tsx      | 310 +++++++-----------
 lib/lists/filter-client.ts           | 132 ++++++++
 tests/lists/filter-client.test.ts    |  97 ++++++
 6 files changed, 877 insertions(+), 293 deletions(-)
```

## Decisions / Rationale
- We removed manual `Apply` as an interaction step because filtering is low-risk, reversible UI state and users expect chip toggles/clear actions to take effect immediately.
- We introduced explicit one-step `Undo` semantics to preserve safe recovery after immediate apply while keeping the control model simple and deterministic.
- We extracted shared client filter helpers into `lib/lists/filter-client.ts` so `ListDrawer` and full-page `ListDetailPanel` normalize canonical filters, field errors, and comparison logic through one code path.
- Tradeoff: immediate apply increases network calls for rapid multi-chip changes, but this was accepted for clearer UX and reduced state divergence between draft and applied filters.

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
- Add an end-to-end assertion for immediate apply + undo once seeded Playwright flows are re-enabled.
- Consider batching/debouncing rapid chip toggles if query load becomes noticeable in profiling.
