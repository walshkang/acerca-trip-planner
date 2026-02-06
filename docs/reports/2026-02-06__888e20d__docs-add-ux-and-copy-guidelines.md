# Learning Report: docs: add ux and copy guidelines

- Date: 2026-02-06
- Commit: 888e20d0f8118b23da68d50fe13a4cba2c4ca703
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add ux and copy guidelines"

## What Changed
```
A	docs/COPY_TONE.md
A	docs/SIGNAL_VISUAL_LANGUAGE.md
A	docs/UX_RULES.md
M	scripts/check-rationale.ts
```

## File Stats
```
 docs/COPY_TONE.md              |  91 ++++++++++++++++++++++++++++++++++
 docs/SIGNAL_VISUAL_LANGUAGE.md | 108 +++++++++++++++++++++++++++++++++++++++++
 docs/UX_RULES.md               |  89 +++++++++++++++++++++++++++++++++
 scripts/check-rationale.ts     |  76 +++++++++++++++++++++++------
 4 files changed, 349 insertions(+), 15 deletions(-)
```

## Decisions / Rationale
- Added three UI/UX docs (`docs/SIGNAL_VISUAL_LANGUAGE.md`, `docs/COPY_TONE.md`, `docs/UX_RULES.md`) to make Phase 2’s map-first UI cohesive and to prevent “floating window” sprawl as we go mobile-first.
- Updated `scripts/check-rationale.ts` to enforce “no TODO placeholders” on **new/changed** learning reports (plus `CONTEXT.md`) without blocking the repo on historical auto-generated reports that haven’t been backfilled yet.
- Tradeoff: older reports can still contain TODOs until we touch/backfill them intentionally; the check now focuses on preventing *new* incomplete reports from landing.

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
- Critique/iterate on the surface model (Context Panel + Tools Sheet) and the URL/state contract (`?place=`, future `?list=`) before refactoring UI code.
- Implement the mobile-first bottom sheet Context Panel and collapse the right-side overlay stack into a single Tools Sheet.
- Backfill rationale/next-steps in older learning reports opportunistically when those areas are edited, or schedule a one-time cleanup pass later.
