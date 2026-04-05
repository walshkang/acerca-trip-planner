# Learning Report: fix: avoid full reload on place selection

- Date: 2026-02-06
- Commit: 70ad9a76390c3e3958aa005454a8f4234b685fee
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "fix: avoid full reload on place selection"

## What Changed
```
M	app/page.tsx
```

## File Stats
```
 app/page.tsx | 15 +++------------
 1 file changed, 3 insertions(+), 12 deletions(-)
```

## Decisions / Rationale
- Selecting a place in a list updates `?place=` (and sometimes `?list=`). When the map route was server-gated in `app/page.tsx`, each query-param change triggered a server render/auth check, which could feel like a full page reload (client state resets, loading flashes).
- Converted `app/page.tsx` to a client component that always renders the map shell; auth gating already exists in `MapContainer`, so query-param changes no longer force server re-navigation for the home page.
- Tradeoff: signed-out users now see the in-app “You’re signed out” state (with preserved deep link) rather than an immediate server redirect.

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
- If we want a hard redirect for signed-out users, reintroduce it on the client (or move auth gating to a layout segment that does not re-run on search-param-only changes).
