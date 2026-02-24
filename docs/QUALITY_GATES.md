# QUALITY_GATES

This file defines the current verification contract for daily work in this repo.

## Purpose
- Keep delivery moving while seeded E2E is only partially active.
- Make current gate status explicit in one place.
- Prevent process drift between hooks, checks, and docs.

## Current Gate Status
- Static contract checks (`npm run check`): always active.
- Unit/API tests (`npm test`): active for behavior changes.
- Seeded Playwright E2E (`npm run test:e2e`): active for the restored seeded suite (10 tests across 4 specs).
- Learning reports: generation can be automated by local post-commit hook; changed/new reports must pass rationale checks.

## Required For Behavior Changes
1. Update or add tests that cover changed behavior.
2. Run `npm run check`.
3. If schema changed, run `npm run db:types`.
4. If report files are changed, fill `Decisions / Rationale` and `Next Steps` with concrete content.

## Decision Table (What To Run)
| Change type | Required commands | Notes |
| --- | --- | --- |
| Any behavior change | `npm run check` and `npm test` | Baseline for deterministic logic + route contracts. |
| Planner move flows, list detail filtering/search, place drawer behavior, map/list URL semantics | `npm run check`, `npm test`, `npm run test:e2e` | Run seeded E2E for cross-surface regressions in these high-risk flows. |
| Schema or migration changes | `npm run check`, `npm test`, `npm run db:types` | Keep generated types synced with schema. |
| Reports changed in diff | Above plus rationale hygiene in changed reports | No TODO placeholders in `Decisions / Rationale` or `Next Steps`. |

## Playwright Gate Policy
- Run `npm run test:e2e` when changing planner move flows, list detail filtering/search flows, place drawer behavior, or map/list URL linking semantics.
- For behavior changes outside restored seeded coverage, treat unit/API tests and `npm run check` as the baseline gate and add E2E when coverage is extended.
- Keep restored seeded coverage listed in `docs/PLAYWRIGHT.md` up to date whenever spec status changes.

## CI Policy
- Pull requests run `npm run check` and `npm test`.
- Seeded Playwright remains a required local gate for the Playwright policy areas above.
- Optional manual CI execution exists via `workflow_dispatch` in `.github/workflows/playwright-seeded.yml` and requires `PLAYWRIGHT_SEED_TOKEN` + `PLAYWRIGHT_STORAGE_STATE_JSON` secrets.

## Hook Policy
- Local hook behavior is developer-machine specific (`core.hooksPath`).
- Hook-generated reports are acceptable, but placeholder TODO text is not accepted in changed reports.

## Process Sync Rule
- If seeded suite scope changes, update both `docs/PLAYWRIGHT.md` and `CONTEXT.md` in the same PR.
