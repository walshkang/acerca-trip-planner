# Learning Report: feat: add discard cleanup for discovery previews

- Date: 2026-02-26
- Commit: (amended; see `git log -1`)
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add discard cleanup for discovery previews"

## What Changed
```
M	CONTEXT.md
A	app/api/places/discard/route.ts
M	components/discovery/Omnibox.tsx
M	components/map/MapContainer.tsx
M	docs/PHASE_3_DISCOVERY_CONTRACT.md
M	docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md
M	lib/state/useDiscoveryStore.ts
M	roadmap.json
A	supabase/migrations/20260226000001_add_discard_place_candidate_rpc.sql
A	tests/discovery/reject-route.test.ts
M	tests/discovery/store.test.ts
```

## File Stats
```
 CONTEXT.md                                         |   3 +-
 app/api/places/discard/route.ts                    |  54 +++++++++
 components/discovery/Omnibox.tsx                   |   6 +-
 components/map/MapContainer.tsx                    |  12 +-
 docs/PHASE_3_DISCOVERY_CONTRACT.md                 |  16 ++-
 docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md        |  21 ++--
 lib/state/useDiscoveryStore.ts                     |  46 ++++++++
 roadmap.json                                       |   6 +-
 ...60226000001_add_discard_place_candidate_rpc.sql |  26 +++++
 tests/discovery/reject-route.test.ts               | 130 +++++++++++++++++++++
 tests/discovery/store.test.ts                      |  76 ++++++++++++
 11 files changed, 371 insertions(+), 25 deletions(-)
```

## Decisions / Rationale
- Implemented a dedicated discard path because preview ingest persists `place_candidates` rows, while the existing close/cancel flows only cleared client state, leaving staged artifacts behind.
- Kept enrichments intact (no orphan cleanup) to preserve Enrich Once, Read Forever: enrichments are content-addressed and may be shared across candidates/places, so deletion is higher risk than leaving frozen rows.
- Made the endpoint and UI path idempotent / fire-and-forget because multiple UI close paths can trigger cleanup; correctness should not depend on de-duping client events.

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
- Apply the migration in the target Supabase environment, then run `npm run db:types` with `SUPABASE_DB_URL` or `SUPABASE_PROJECT_REF` so `discard_place_candidate` appears in generated types.
