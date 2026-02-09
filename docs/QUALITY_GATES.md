# QUALITY_GATES

This file defines the current verification contract for daily work in this repo.

## Purpose
- Keep delivery moving while seeded E2E is paused.
- Make current gate status explicit in one place.
- Prevent process drift between hooks, checks, and docs.

## Current Gate Status
- Unit and integration tests (`npm test`): active when behavior changes.
- Static contract checks (`npm run check`): active and expected before push when possible.
- Seeded Playwright E2E (`npm run test:e2e`): paused for default workflow.
- Learning reports: generation can be automated by local post-commit hook; changed/new reports must pass rationale checks.

## Required For Behavior Changes
1. Update or add tests that cover changed behavior.
2. Run `npm run check`.
3. If schema changed, run `npm run db:types`.
4. If report files are changed, fill `Decisions / Rationale` and `Next Steps` with concrete content.

## Playwright Pause Policy
- E2E specs may remain skipped while seeded infra is descoped.
- Do not treat paused E2E as a blocker for merge when unit/contract checks are green.
- When E2E resumes, update this file and re-enable required `test:e2e` gates.

## Hook Policy
- Local hook behavior is developer-machine specific (`core.hooksPath`).
- Hook-generated reports are acceptable, but placeholder TODO text is not accepted in changed reports.
