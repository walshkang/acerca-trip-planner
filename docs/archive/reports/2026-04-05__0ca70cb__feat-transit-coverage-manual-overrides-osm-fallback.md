# Learning Report: feat: transit coverage — manual overrides + OSM fallback

- Date: 2026-04-05
- Commit: 0ca70cb02a5b787fc7935dd87994f1a8ffd6b0cd
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: transit coverage — manual overrides + OSM fallback"

## What Changed
```
M	CONTEXT.md
M	app/api/transit/routes/route.ts
A	cursor-prompts/transit-coverage-s1.md
A	cursor-prompts/transit-coverage-s4.md
M	lib/transit/metroArea.ts
A	lib/transit/osm.ts
A	scripts/normalize-paris-transit.py
M	tests/transit/metroArea.test.ts
A	tests/transit/osm.test.ts
```

## File Stats
```
 CONTEXT.md                            |  46 ++++--
 app/api/transit/routes/route.ts       |  66 +++++++-
 cursor-prompts/transit-coverage-s1.md | 115 ++++++++++++++
 cursor-prompts/transit-coverage-s4.md | 290 ++++++++++++++++++++++++++++++++++
 lib/transit/metroArea.ts              |  15 ++
 lib/transit/osm.ts                    | 122 ++++++++++++++
 scripts/normalize-paris-transit.py    | 113 +++++++++++++
 tests/transit/metroArea.test.ts       |  12 +-
 tests/transit/osm.test.ts             |  56 +++++++
 9 files changed, 822 insertions(+), 13 deletions(-)
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
