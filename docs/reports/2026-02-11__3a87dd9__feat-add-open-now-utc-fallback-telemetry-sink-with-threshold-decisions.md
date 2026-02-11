# Learning Report: feat: add open_now UTC fallback telemetry sink with threshold decisions

- Date: 2026-02-11
- Commit: 3a87dd91e9c4ef5750c940efc8db25b53ab00f08
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add open_now UTC fallback telemetry sink with threshold decisions"

## What Changed
```
M	app/api/filters/query/route.ts
M	lib/filters/open-now.ts
A	lib/server/filters/open-now-telemetry.ts
A	supabase/migrations/20260211000001_add_open_now_filter_telemetry.sql
A	tests/filters/open-now-telemetry.test.ts
M	tests/filters/open-now.test.ts
M	tests/filters/query-route.test.ts
```

## File Stats
```
 app/api/filters/query/route.ts                     | 135 +++++++++++++++++----
 lib/filters/open-now.ts                            |  77 ++++++++++--
 lib/server/filters/open-now-telemetry.ts           | 125 +++++++++++++++++++
 ...0260211000001_add_open_now_filter_telemetry.sql | 103 ++++++++++++++++
 tests/filters/open-now-telemetry.test.ts           | 119 ++++++++++++++++++
 tests/filters/open-now.test.ts                     |  49 +++++++-
 tests/filters/query-route.test.ts                  | 131 ++++++++++++++++++++
 7 files changed, 703 insertions(+), 36 deletions(-)
```

## Decisions / Rationale
- Added a server-side telemetry sink so `open_now` UTC-fallback usage is observable as daily aggregates instead of ephemeral logs.
- Chose a Supabase RPC upsert path (`record_open_now_filter_telemetry`) to keep writes atomic and avoid read-modify-write races.
- Encoded decision gates directly in code (`<1%` no action, `1%-5%` monitor, `>5%` backfill candidate) so every event carries an actionable classification.
- Kept filter behavior fail-open by swallowing telemetry sink errors after structured error logging, preventing observability failures from breaking query responses.

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
- Regenerate `lib/supabase/types.ts` once CLI access is stable in this environment so migration-side RPC/table types are reflected.
- Add a lightweight operational review cadence for `backfill_candidate` events to determine whether enrichment-time timezone backfill should be prioritized.
