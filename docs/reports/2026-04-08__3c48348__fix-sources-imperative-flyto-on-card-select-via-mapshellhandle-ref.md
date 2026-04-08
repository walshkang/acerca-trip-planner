# Learning Report: fix(sources): imperative flyTo on card select via MapShellHandle ref

- Date: 2026-04-08
- Commit: 3c48348f2af000e8355f629dfb6d10c4fe57c910
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix(sources): imperative flyTo on card select via MapShellHandle ref"

## What Changed
```
M	components/app/SourcesShellPaper.tsx
```

## File Stats
```
 components/app/SourcesShellPaper.tsx | 13 +++++++++++--
 1 file changed, 11 insertions(+), 2 deletions(-)
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
