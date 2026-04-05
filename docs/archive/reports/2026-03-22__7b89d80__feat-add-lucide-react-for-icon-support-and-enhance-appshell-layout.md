# Learning Report: feat: add lucide-react for icon support and enhance AppShell layout

- Date: 2026-03-22
- Commit: 7b89d8018bac292ccf74b3e337bcb81cff7147ae
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add lucide-react for icon support and enhance AppShell layout"

## What Changed
```
M	components/app/AppShell.tsx
A	components/app/NavFooter.tsx
A	components/app/NavRail.tsx
A	docs/reports/2026-03-22__b3ad406__feat-p3-e3-ux-pivot-phase-1-shell-split-appshell-exploreshell-plannershell.md
A	docs/reports/2026-03-22__de4dc36__feat-p3-e3-ux-pivot-phase-0-foundation-schema-stores-api.md
M	package-lock.json
M	package.json
```

## File Stats
```
 components/app/AppShell.tsx                        | 15 ++--
 components/app/NavFooter.tsx                       | 84 ++++++++++++++++++++++
 components/app/NavRail.tsx                         | 84 ++++++++++++++++++++++
 ...ell-split-appshell-exploreshell-plannershell.md | 55 ++++++++++++++
 ...x-pivot-phase-0-foundation-schema-stores-api.md | 77 ++++++++++++++++++++
 package-lock.json                                  | 10 +++
 package.json                                       |  1 +
 7 files changed, 321 insertions(+), 5 deletions(-)
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
