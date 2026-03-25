# Learning Report: docs: add LLM client reference prompt (slice E) and fix EnergyEnum import

- Date: 2026-03-25
- Commit: 0f98e269e90889dbf48050e7a0e110a4ec52a718
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: add LLM client reference prompt (slice E) and fix EnergyEnum import"

## What Changed
```
A	docs/LLM_PLANNING_CLIENT_PROMPT.md
M	lib/import/compute.ts
```

## File Stats
```
 docs/LLM_PLANNING_CLIENT_PROMPT.md | 289 +++++++++++++++++++++++++++++++++++++
 lib/import/compute.ts              |   1 +
 2 files changed, 290 insertions(+)
```

## Decisions / Rationale
- Auto-generated from commit metadata. If this report is included in a PR, replace this line with concrete rationale and tradeoffs from the implementation.

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
- No follow-up actions were captured automatically.
