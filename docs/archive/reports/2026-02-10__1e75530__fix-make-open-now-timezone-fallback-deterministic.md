# Learning Report: fix: make open_now timezone fallback deterministic

- Date: 2026-02-10
- Commit: 1e75530d0bd601941b2098319b4985193e55743d
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: make open_now timezone fallback deterministic"

## What Changed
```
M	lib/filters/open-now.ts
M	tests/filters/open-now.test.ts
M	tests/filters/query-route.test.ts
```

## File Stats
```
 lib/filters/open-now.ts           |   7 ++
 tests/filters/open-now.test.ts    |  57 +++++++++++
 tests/filters/query-route.test.ts | 205 ++++++++++++++++++++++++++++++++++++++
 3 files changed, 269 insertions(+)
```

## Decisions / Rationale
- Introduced a deterministic `UTC` fallback when weekly periods exist but timezone metadata is missing so `open_now` filtering remains stable at runtime.
- Kept timezone precedence explicit: place timezone metadata first, list timezone fallback second, then utc offset, then deterministic `UTC`.
- Preserved behavior where period-less payloads still defer to stored `open_now` booleans, minimizing regression risk in legacy payloads.
- Added coverage for DST transition and cross-midnight windows to lock correctness around the highest-risk time arithmetic paths.

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
- Monitor fallback-path usage in production traffic to decide whether timezone metadata backfill is necessary.
- Keep deterministic precedence rules unchanged unless provider payload contracts materially change.
