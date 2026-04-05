# Learning Report: feat: magic-link auth, ingest candidates, normalize, place detail

- Date: 2026-01-27
- Commit: 9d548d9d0a6c23f5ee9fc7c956464c0ecc4a7554
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: magic-link auth, ingest candidates, normalize, place detail"

## What Changed
```
M	app/api/enrichment/route.ts
A	app/api/places/[id]/user-meta/route.ts
A	app/api/places/ingest/route.ts
A	app/auth/callback/route.ts
A	app/auth/sign-in/page.tsx
A	app/auth/sign-out/route.ts
M	app/page.tsx
A	app/places/[id]/page.tsx
M	components/map/MapContainer.tsx
A	components/places/PlaceUserMetaForm.tsx
M	lib/enrichment/sources.ts
M	lib/server/enrichment/normalize.ts
A	lib/server/places/getPlaceEnrichment.ts
M	lib/supabase/client.ts
M	package-lock.json
M	package.json
```

## File Stats
```
 app/api/enrichment/route.ts             |  31 ++-
 app/api/places/[id]/user-meta/route.ts  |  63 +++++
 app/api/places/ingest/route.ts          | 142 ++++++++++
 app/auth/callback/route.ts              |  16 ++
 app/auth/sign-in/page.tsx               | 106 ++++++++
 app/auth/sign-out/route.ts              |  11 +
 app/page.tsx                            |  13 +-
 app/places/[id]/page.tsx                | 134 ++++++++++
 components/map/MapContainer.tsx         |  52 +++-
 components/places/PlaceUserMetaForm.tsx |  97 +++++++
 lib/enrichment/sources.ts               |  53 ++++
 lib/server/enrichment/normalize.ts      | 178 ++++++++++++-
 lib/server/places/getPlaceEnrichment.ts |  30 +++
 lib/supabase/client.ts                  |   4 +-
 package-lock.json                       | 457 ++++++++++++++++++++++++++++++++
 package.json                            |   1 +
 16 files changed, 1362 insertions(+), 26 deletions(-)
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
