# QUALITY_GATES

This file defines the current verification contract for daily work in this repo.

## Purpose
- Keep delivery moving while seeded E2E is only partially active.
- Make current gate status explicit in one place.
- Prevent process drift between hooks, checks, and docs.

## Current Gate Status
- Unit and integration tests (`npm test`): active when behavior changes.
- Static contract checks (`npm run check`): active and expected before push when possible.
- Seeded Playwright E2E (`npm run test:e2e`): active for the restored seeded suite (8 tests across 4 specs).
- Learning reports: generation can be automated by local post-commit hook; changed/new reports must pass rationale checks.

## Required For Behavior Changes
1. Update or add tests that cover changed behavior.
2. Run `npm run check`.
3. If schema changed, run `npm run db:types`.
4. If report files are changed, fill `Decisions / Rationale` and `Next Steps` with concrete content.

## Playwright Gate Policy
- Run `npm run test:e2e` when changing planner move flows, list detail filtering/search flows, place drawer behavior, or map/list URL linking semantics.
- For behavior changes outside restored seeded coverage, treat unit/API tests and `npm run check` as the baseline gate and add E2E when coverage is extended.
- Keep restored seeded coverage listed in `docs/PLAYWRIGHT.md` up to date whenever spec status changes.

## Hook Policy
- Local hook behavior is developer-machine specific (`core.hooksPath`).
- Hook-generated reports are acceptable, but placeholder TODO text is not accepted in changed reports.
