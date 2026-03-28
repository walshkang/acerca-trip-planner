# Learning Report: feat: onboarding tooltip system — state-triggered contextual tips for new users

- Date: 2026-03-28
- Commit: 7c476589e95ca98363e43b050269642902c0cf7e
- Author: Walsh Kang

## Summary
- Auto-generated report for learning and review.
- Commit message: "feat: onboarding tooltip system — state-triggered contextual tips for new users"

## What Changed
```
M	app/api/user/preferences/route.ts
M	components/app/ExploreShellPaper.tsx
A	components/app/OnboardingLayer.tsx
M	components/app/PlannerShellPaper.tsx
M	components/paper/PaperHeader.tsx
M	components/planner/CalendarPlanner.tsx
M	components/stitch/InspectorCard.tsx
A	components/ui/OnboardingTooltip.tsx
A	lib/state/useOnboardingStore.ts
A	supabase/migrations/20260328000001_add_onboarding_to_preferences.sql
```

## File Stats
```
 app/api/user/preferences/route.ts                  |  44 +++++-
 components/app/ExploreShellPaper.tsx               |  45 +++---
 components/app/OnboardingLayer.tsx                 | 112 ++++++++++++++
 components/app/PlannerShellPaper.tsx               |   5 +-
 components/paper/PaperHeader.tsx                   |   1 +
 components/planner/CalendarPlanner.tsx             |   2 +-
 components/stitch/InspectorCard.tsx                |   1 +
 components/ui/OnboardingTooltip.tsx                | 163 +++++++++++++++++++++
 lib/state/useOnboardingStore.ts                    | 125 ++++++++++++++++
 ...0260328000001_add_onboarding_to_preferences.sql |   3 +
 10 files changed, 474 insertions(+), 27 deletions(-)
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
