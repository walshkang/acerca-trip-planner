# Learning Report: chore: regenerate supabase types after telemetry migration

- Date: 2026-02-11
- Commit: 7a1639d3aea4c91caf1630e7369e54edda2448e5
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: regenerate supabase types after telemetry migration"

## What Changed
```
M	lib/supabase/types.ts
```

## File Stats
```
 lib/supabase/types.ts | 79 +++++++++++++++++++++++++++++++++++++++++++++++++--
 1 file changed, 77 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Regenerated Supabase types after applying pending remote migrations so TypeScript contracts match the runtime database schema.
- Confirmed telemetry additions are represented in generated types (`open_now_filter_telemetry_daily` table and `record_open_now_filter_telemetry` RPC), reducing drift risk between DB and app code.
- Kept the change scoped to generated output only; no behavior or API logic changes were introduced in this commit.

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
- Continue running `npm run db:types` immediately after future schema migrations to keep generated DB contracts current.
- If type generation stalls again, prefer the installed `supabase` CLI path and verify `SUPABASE_DB_URL` is unset when using project-ref generation.
