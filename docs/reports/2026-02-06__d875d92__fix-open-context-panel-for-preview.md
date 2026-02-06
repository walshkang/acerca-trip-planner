# Learning Report: fix: open context panel for preview

- Date: 2026-02-06
- Commit: d875d92784f205720d7f115d718e238c3ae8f415
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: open context panel for preview"

## What Changed
```
M	components/map/MapContainer.tsx
```

## File Stats
```
 components/map/MapContainer.tsx | 13 +++++++++++--
 1 file changed, 11 insertions(+), 2 deletions(-)
```

## Decisions / Rationale
- Fixed a UX regression introduced by the Context Panel refactor: clicking an Omnibox search result creates a preview (`previewCandidate`) but the panel open-state was gated only on `drawerOpen`/`?place=`, so the preview Inspector could be “invisible”.
- The panel now opens when a preview exists, switches to Place mode for preview, and allows the mobile “Place” tab when preview is present (even without `?place=` yet).
- Tradeoff: Context Panel open-state now depends on discovery preview state; this is intentional because preview is an interactive decision point (approve/close) and should always be visible.

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
- Consider adding a small “Preview” label in the Place header when `previewCandidate` exists (to reinforce truth vs preview).
- Align the `?list=` contract and localStorage fallback so list selection + preview behave consistently across reloads.
