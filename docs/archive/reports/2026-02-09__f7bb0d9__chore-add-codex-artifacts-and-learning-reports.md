# Learning Report: chore: add codex artifacts and learning reports

- Date: 2026-02-09
- Commit: f7bb0d9d6e20a4f90825566619e111d06d57e29d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: add codex artifacts and learning reports"

## What Changed
```
A	.codex/environments/environment.toml
A	docs/reports/2026-02-08__3808e5c__fix-trip-date-changes-place-drawer-errors-omnibox-light-mode.md
A	docs/reports/2026-02-09__e75d191__feat-tighten-map-focus-state-and-add-active-list-removal.md
```

## File Stats
```
 .codex/environments/environment.toml               | 11 ++++
 ...anges-place-drawer-errors-omnibox-light-mode.md | 53 +++++++++++++++
 ...-map-focus-state-and-add-active-list-removal.md | 75 ++++++++++++++++++++++
 3 files changed, 139 insertions(+)
```

## Decisions / Rationale
- Captured Codex environment artifacts and related reports so local agent behavior and historical changes stay reproducible.
- Tradeoff: committing generated report metadata increases docs churn, but keeps implementation context auditable.

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
- Capture concrete follow-ups in commit message or report immediately.

## Next Steps
- Keep auto-generated reports aligned with repository checks so placeholders never block `npm run check`.
- Consider narrowing which generated artifacts should be committed to reduce noise in report-only diffs.
