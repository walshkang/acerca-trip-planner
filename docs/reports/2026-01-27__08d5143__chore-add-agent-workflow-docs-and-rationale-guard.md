# Learning Report: chore: add agent workflow docs and rationale guard

- Date: 2026-01-27
- Commit: 08d5143a17329cf38c4a764094eaa062225e8728
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: add agent workflow docs and rationale guard"

## What Changed
```
A	.github/pull_request_template.md
M	.github/workflows/validate-json.yml
A	AGENTS.md
M	CONTEXT.md
A	docs/VIBE_PLAYBOOK.md
M	package.json
A	prompts/agent_task.md
A	scripts/check-rationale.ts
```

## File Stats
```
 .github/pull_request_template.md    | 17 ++++++++
 .github/workflows/validate-json.yml | 10 +++--
 AGENTS.md                           | 31 ++++++++++++++
 CONTEXT.md                          |  6 +++
 docs/VIBE_PLAYBOOK.md               | 27 +++++++++++++
 package.json                        |  2 +
 prompts/agent_task.md               | 16 ++++++++
 scripts/check-rationale.ts          | 81 +++++++++++++++++++++++++++++++++++++
 8 files changed, 186 insertions(+), 4 deletions(-)
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
