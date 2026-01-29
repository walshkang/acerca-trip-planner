# Learning Report: chore: harden typegen script

- Date: 2026-01-29
- Commit: ac5f980b4096f02ff1d8646b92d2303be19dcdbc
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: harden typegen script"

## What Changed
```
M	SETUP.md
M	scripts/gen-db-types.sh
```

## File Stats
```
 SETUP.md                |  5 +++++
 scripts/gen-db-types.sh | 29 +++++++++++++++++++++++------
 2 files changed, 28 insertions(+), 6 deletions(-)
```

## Decisions / Rationale
- Added a temp-file write to prevent empty type outputs from overwriting `lib/supabase/types.ts`.
- Documented the no-Docker workflow in setup to reduce failed typegen runs.

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
- If we adopt CI type checks, ensure the same temp-file guard is used in automation.
