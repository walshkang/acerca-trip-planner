# Learning Report: docs: align vibe coding guidance

- Date: 2026-01-27
- Commit: 1a6b441f7904bc50a20e2f48774e365b4ff685ff
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "docs: align vibe coding guidance"

## What Changed
```
M	.github/pull_request_template.md
M	AGENTS.md
M	CONTEXT.md
M	IMPLEMENTATION.md
M	README.md
M	SETUP.md
M	docs/VIBE_PLAYBOOK.md
M	prompts/agent_task.md
```

## File Stats
```
 .github/pull_request_template.md |  2 ++
 AGENTS.md                        |  6 ++++++
 CONTEXT.md                       |  1 +
 IMPLEMENTATION.md                |  2 ++
 README.md                        |  9 +++++++++
 SETUP.md                         | 16 ++++++++++++++--
 docs/VIBE_PLAYBOOK.md            |  5 +++++
 prompts/agent_task.md            |  2 +-
 8 files changed, 40 insertions(+), 3 deletions(-)
```

## Decisions / Rationale
- Draft pending: capture rationale and tradeoffs in a follow-up pass.

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
- Draft pending: document follow-ups/risks in a follow-up pass.
