# Learning Report: chore: add list workspace tags to roadmap

- Date: 2026-01-28
- Commit: 36e3db489e9e785ec5f81e52c19439297ddeae43
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: add list workspace tags to roadmap"

## What Changed
```
M	CONTEXT.md
M	roadmap.json
```

## File Stats
```
 CONTEXT.md   |  4 ++++
 roadmap.json | 10 ++++++++++
 2 files changed, 14 insertions(+)
```

## Decisions / Rationale
- Added a Phase 2 epic for list detail browsing and per-place tags to align the roadmap with the desired Google Maps-like workflow.
- Chose list-scoped tags (not global) to keep semantics clear and avoid cross-list coupling.

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
- Define list tag filtering semantics (AND vs OR) before implementation.
- Decide whether tag editing is inline or via a detail drawer for mobile.
