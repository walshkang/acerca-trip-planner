# Learning Report: fix: show loading preview after selecting search result

- Date: 2026-02-06
- Commit: 55414b678d5e99d0f4bb8f53e8f3a4d8d099a8c1
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: show loading preview after selecting search result"

## What Changed
```
M	components/map/MapContainer.tsx
M	lib/state/useDiscoveryStore.ts
```

## File Stats
```
 components/map/MapContainer.tsx | 53 ++++++++++++++++++++++++++++++++++-------
 lib/state/useDiscoveryStore.ts  |  1 +
 2 files changed, 46 insertions(+), 8 deletions(-)
```

## Decisions / Rationale
- Fixed a “nothing happens” UX on search result click: preview ingestion can take ~2s, but the map shell previously opened the Preview surface only after `previewCandidate` arrived, so there was no immediate feedback.
- The Preview surface now opens as soon as a result is selected (based on `selectedResultId`) and shows an explicit “Loading preview…” state while `/api/places/ingest` runs.
- Also closes the Omnibox dropdown on selection (clearing results) so the preview surface is visually unblocked.
- Tradeoff: `selectedResultId` now doubles as “preview active” state; if we later need selection independent from preview, we should split this into a dedicated preview state field.

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
- Consider adding a dedicated `previewingPlaceId` in the discovery store for clarity (decouple from result selection).
- Add a small toast or inline error state for preview failures (already shown in-panel) and ensure Close/Back always restores pre-preview list view.
