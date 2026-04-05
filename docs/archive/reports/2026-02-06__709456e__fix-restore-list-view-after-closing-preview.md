# Learning Report: fix: restore list view after closing preview

- Date: 2026-02-06
- Commit: 709456e797d8e61b08ed90450f34f0df2257b629
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: restore list view after closing preview"

## What Changed
```
M	components/discovery/InspectorCard.tsx
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/discovery/InspectorCard.tsx |  7 ++--
 components/map/MapContainer.tsx        | 60 ++++++++++++++++++++++++++++++++--
 2 files changed, 63 insertions(+), 4 deletions(-)
```

## Decisions / Rationale
- Fixed a preview close behavior regression: if a user had an active list open, previewing a searched place would hide the list, but closing the preview did not restore the previous list view.
- The map shell now snapshots “pre-preview” UI state (list drawer open + focused list place + panel mode) when entering preview and restores it when preview is dismissed without approving a place.
- Wired the Inspector’s Close button to a map-shell cancel handler so we can restore state before clearing discovery preview (avoids the panel disappearing/reappearing).
- Tradeoff: we add a small amount of orchestration state in `MapContainer` to make preview behave like a temporary modal mode.

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
- Add a small unit test around the pre-preview snapshot/restore logic if we extract it into a helper.
- Consider whether “closing preview” should also restore list scroll position (future refinement).
