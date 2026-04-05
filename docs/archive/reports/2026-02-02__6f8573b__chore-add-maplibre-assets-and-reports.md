# Learning Report: chore: add maplibre assets and reports

- Date: 2026-02-02
- Commit: 6f8573b85203b3ac0917c5c17e3fc82a19a5d3f4
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "chore: add maplibre assets and reports"

## What Changed
```
M	.gitattributes
A	docs/reports/2026-02-02__1a60280__chore-add-maplibre-assets-and-reports.md
A	docs/reports/2026-02-02__3273f0c__fix-sync-list-tags-and-stabilize-e2e-flows.md
A	docs/reports/2026-02-02__c4faf37__feat-add-list-filters-and-focused-glow.md
A	public/map/bangkok.pmtiles
A	public/map/hk.pmtiles
A	public/map/nyc.pmtiles
A	public/map/singapore.pmtiles
```

## File Stats
```
 .gitattributes                                     |  1 +
 ...60280__chore-add-maplibre-assets-and-reports.md | 57 ++++++++++++++++++
 ...__fix-sync-list-tags-and-stabilize-e2e-flows.md | 61 ++++++++++++++++++++
 ...af37__feat-add-list-filters-and-focused-glow.md | 67 ++++++++++++++++++++++
 public/map/bangkok.pmtiles                         |  3 +
 public/map/hk.pmtiles                              |  3 +
 public/map/nyc.pmtiles                             |  3 +
 public/map/singapore.pmtiles                       |  3 +
 8 files changed, 198 insertions(+)
```

## Decisions / Rationale
- TODO: Add why these changes were made and any tradeoffs.

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
- TODO: List follow-ups or risks.
