# VIBE_PLAYBOOK

A short, repeatable checklist for building in this repo.

## Before You Code
- Restate the goal and non-goals in 1-2 sentences.
- List the invariants that must not change.
- Propose the smallest reproducible change and a verification plan.
- Identify which files you will touch and why.

## While Coding
- Prefer server-side Supabase for privileged ops; use RPC or server routes for writes.
- Keep diffs small; separate regen/formatting from behavior changes.
- Any new enums/taxonomies must update exhaustive checks and tests.
- Avoid unversioned refreshes of enrichment data.

## Done Means
- Tests updated/added for new behavior and edge cases.
- Clear verification steps documented and run when possible.
- Migrations applied and `npm run db:types` run if schema changed.
- Decisions / Rationale and Next Steps are filled (no TODO placeholders).
- Legacy learning reports may contain TODOs; any new/changed report must be fully filled (enforced by `scripts/check-rationale.ts`).

## Common Pitfalls
- TODO rationale left blank in reports.
- Client-side usage of service role keys.
- UI icon taxonomy mismatches with AI outputs.
- Regen/formatting mixed into behavior diffs.

## For Humans
- Use the PR template and record decisions/tradeoffs.
- Run `npm run check` before pushing when possible.
- Keep learning reports filled (no TODO placeholders).
