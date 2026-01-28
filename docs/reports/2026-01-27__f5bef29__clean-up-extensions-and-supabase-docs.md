# Learning Report: clean up extensions and supabase docs

- Date: 2026-01-27
- Commit: f5bef29c4a39047e7f49901f7a2ffde8d40651f8
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "clean up extensions and supabase docs"

## What Changed
```
A	.vscode/extensions.json
A	.vscode/settings.json
A	supabase/.gitignore
M	supabase/config.toml
```

## File Stats
```
 .vscode/extensions.json |   3 +
 .vscode/settings.json   |  24 ++++
 supabase/.gitignore     |   8 ++
 supabase/config.toml    | 325 ++++++++++++++++++++++++++++++++++++++++++++++--
 4 files changed, 352 insertions(+), 8 deletions(-)
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
