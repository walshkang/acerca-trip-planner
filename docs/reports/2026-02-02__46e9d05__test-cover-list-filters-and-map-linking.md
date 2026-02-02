# Learning Report: test: cover list filters and map linking

- Date: 2026-02-02
- Commit: 46e9d050a2f23ea51177e240700b95280327cecf
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "test: cover list filters and map linking"

## What Changed
```
A	docs/reports/2026-02-02__6f8573b__chore-add-maplibre-assets-and-reports.md
A	tests/e2e/list-filters-and-map-link.spec.ts
```

## File Stats
```
 ...8573b__chore-add-maplibre-assets-and-reports.md |  61 +++++++++
 tests/e2e/list-filters-and-map-link.spec.ts        | 151 +++++++++++++++++++++
 2 files changed, 212 insertions(+)
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
