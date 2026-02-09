# Learning Report: feat: add deterministic filter translate/query pipeline

- Date: 2026-02-09
- Commit: b6f319322533209d17dcc31996978cd595352faa
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: add deterministic filter translate/query pipeline"

## What Changed
```
A	app/api/filters/query/route.ts
A	app/api/filters/translate/route.ts
M	components/lists/ListDetailBody.tsx
M	components/lists/ListDetailPanel.tsx
M	components/lists/ListDrawer.tsx
A	lib/filters/schema.ts
A	lib/server/filters/translate.ts
A	tests/filters/query-route.test.ts
A	tests/filters/schema.test.ts
A	tests/filters/translate-route.test.ts
```

## File Stats
```
 app/api/filters/query/route.ts        | 314 ++++++++++++++++++++++++++
 app/api/filters/translate/route.ts    | 115 ++++++++++
 components/lists/ListDetailBody.tsx   |  58 +++++
 components/lists/ListDetailPanel.tsx  |   1 +
 components/lists/ListDrawer.tsx       | 268 +++++++++++++++++++++--
 lib/filters/schema.ts                 | 400 ++++++++++++++++++++++++++++++++++
 lib/server/filters/translate.ts       | 235 ++++++++++++++++++++
 tests/filters/query-route.test.ts     | 126 +++++++++++
 tests/filters/schema.test.ts          |  86 ++++++++
 tests/filters/translate-route.test.ts | 193 ++++++++++++++++
 10 files changed, 1781 insertions(+), 15 deletions(-)
```

## Decisions / Rationale
- We introduced a server-owned filter contract (`lib/filters/schema.ts`) so every client path (manual filters, translated intent, and query execution) shares the same canonicalization and validation rules.
- We kept translation and query as separate endpoints (`/api/filters/translate` and `/api/filters/query`) to preserve the invariant that LLM work is limited to intent translation while retrieval stays deterministic.
- We added strict unknown-key rejection and field-level errors so invalid payloads fail explicitly instead of being silently ignored, reducing drift between UI state and backend filtering behavior.
- We used deterministic fallback translation when `OPENAI_API_KEY` is unavailable to keep behavior stable in local/dev and prevent hard dependency on LLM availability.

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
- Wire the same intent-to-filter flow into the full-page list detail experience so drawer and page filtering behavior stay aligned.
- Update active project context tracking to mark the translate/query pipeline complete and move the blocker to the next unshipped P2-E2 task.
- Add end-to-end coverage for the intent input path once seeded Playwright flows are re-enabled.
