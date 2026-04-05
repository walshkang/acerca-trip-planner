# Learning Report: fix: make preview independent from active list

- Date: 2026-02-06
- Commit: 32c43e2652fe5979a544ab60a24f59146c0ec8eb
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: make preview independent from active list"

## What Changed
```
M	components/discovery/InspectorCard.tsx
M	components/map/MapContainer.tsx
M	components/ui/ContextPanel.tsx
```

## File Stats
```
 components/discovery/InspectorCard.tsx |  21 ++++--
 components/map/MapContainer.tsx        | 123 ++++++++++++++++++++-------------
 components/ui/ContextPanel.tsx         |  18 +++--
 3 files changed, 102 insertions(+), 60 deletions(-)
```

## Decisions / Rationale
- Fixed a confusing interaction in the new split-view Context Panel: previewing an Omnibox search result could surface an unrelated active list + focused list row at the same time, making the preview feel “already in” a list.
- The preview surface is now treated as its own mode:
  - Desktop preview shows a single-column panel (no list split view) so the user can focus on approve + optional list assignment.
  - Map list-dimming and list-row focus are suppressed/cleared while a preview is active.
- Updated the preview approve UI to default to **No list** and require an explicit list choice to enable list-item tags.
- Tradeoff: list context is temporarily hidden during preview (by design); users can still switch to Lists via the UI when needed.

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
- Consider adding a small “Preview” label in the header/body so the truth boundary is unmistakable.
- Decide the final `?list=` contract and whether to ever auto-write localStorage fallback into the URL (push vs replace).
