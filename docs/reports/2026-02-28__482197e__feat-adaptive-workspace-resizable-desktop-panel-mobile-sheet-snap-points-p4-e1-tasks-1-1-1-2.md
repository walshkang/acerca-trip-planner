# Learning Report: feat: adaptive workspace — resizable desktop panel + mobile sheet snap points (P4-E1 tasks 1.1, 1.2)

- Date: 2026-02-28
- Commit: 482197e9f404922aec01030cbaa56902e4e40c3e
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: adaptive workspace — resizable desktop panel + mobile sheet snap points (P4-E1 tasks 1.1, 1.2)"

## What Changed
```
M	components/map/MapContainer.tsx
M	components/ui/ContextPanel.tsx
```

## File Stats
```
 components/map/MapContainer.tsx |  38 +++++-
 components/ui/ContextPanel.tsx  | 278 +++++++++++++++++++++++++++++++++++++---
 2 files changed, 293 insertions(+), 23 deletions(-)
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
