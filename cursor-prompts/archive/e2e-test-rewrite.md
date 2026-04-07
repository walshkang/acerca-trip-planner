# E2E Test Rewrite — Paper Shell

> **Read first:** `cursor-prompts/agent_task.md` — preamble, invariants, and DoD (including CONTEXT.md update requirement).

## Goal

Rewrite the 12 failing Playwright E2E tests against the current paper shell UI. All failures are stale selectors from the deleted NavRail/ContextPanel/WorkspaceContainer architecture (removed in P3-E3). The test infrastructure (auth, seeding, port 3010) is fully working — only the UI selectors and flows need updating.

**Do not patch selectors one by one.** For each spec, read the test's intent, then rewrite from scratch against what the paper shell actually renders.

---

## Read First

1. `tests/e2e/seeded-helpers.ts` — full helper inventory; understand what's available before writing
2. `tests/e2e/global-setup.ts` — auth flow context
3. `components/app/ExploreShellPaper.tsx` — paper explore shell structure + testids
4. `components/paper/PaperHeader.tsx` — tab testids (`paper-header-tab-map`, `paper-header-tab-itinerary`, `paper-header-tab-sources`)
5. `components/paper/PaperExplorePanel.tsx` — panel testid: `paper-explore-panel`
6. `components/stitch/ListDrawer.tsx` — list drawer
7. `components/stitch/PlaceDrawer.tsx` — place drawer
8. `components/app/PlannerShellPaper.tsx` — planner shell + CalendarPlanner

---

## Infrastructure (do not change)

- Dev server: `http://localhost:3010`
- Auth: fully automated via `global-setup.ts` → `POST /api/test/auth` + `POST /api/beta-unlock` → `playwright/.auth/user.json`
- Seeding: `seedListWithPlace`, `addPlaceToList`, `setListItemTags`, `setTripDates`, `cleanupSeededData` in `seeded-helpers.ts`
- Run: `npm run test:e2e`

---

## Spec-by-Spec Triage

### `workspace-adaptive.spec.ts` — DELETE AND REPLACE

The entire concept (workspace panel, resize handle, `context-panel-desktop`) was deleted in P3-E3. Replace with a new spec that tests the paper shell's responsive behavior:

**New spec: `paper-shell-responsive.spec.ts`**
- On desktop (`md+`): `paper-explore-panel` is visible as a right rail
- On mobile: `paper-explore-panel` is a bottom sheet (peek state by default)
- Switching tabs via `paper-header-tab-itinerary` navigates to planner shell (`data-testid="planner-shell"`)
- Switching back via `paper-header-tab-map` returns to explore shell

### `list-filters-and-map-link.spec.ts` — REWRITE

**Intent:** Tag filters on list items work in the list detail view.

**Current broken selectors:** likely `list-drawer`, `context-panel-*` variants.

**Rewrite against:** After navigating to `/lists/:id`, the paper shell renders in explore mode. The list detail is accessible via `PaperExplorePanel` → `ListDrawer` / `ListDetailBody`. Find actual testids in `ListDetailBody.tsx` and `ListDrawer.tsx` before writing.

Key flow:
1. Seed two places in a list, apply different tags to each
2. Navigate to the list in explore mode
3. Filter by tag → assert only matching place visible
4. Clear filter → both places visible

### `list-local-search.spec.ts` — LIKELY MINIMAL CHANGES

**Intent:** Local search input in list detail finds approved places by name.

The placeholder `'Search approved places'` may still be correct — verify in `ListDetailBody.tsx`. If the selector works, this test may need only a navigation fix (how to get the list detail into view in the paper shell).

### `list-planner-move.spec.ts` — REWRITE

**Intent:** Items can be moved between days in the planner.

The `openPlanTab` helper already uses `paper-header-tab-itinerary` — partially updated. But the drag/drop or move interactions likely reference old selectors. Read the full test and rewrite the move interaction against `CalendarPlanner`'s actual testids.

Find testids in: `components/stitch/planner/` directory.

### `map-place-drawer.spec.ts` — TARGETED UPDATE

**Intent:** Clicking a map pin opens the PlaceDrawer with place details; membership (add to list) works.

Most of this test's logic is in `waitForPlaceDrawerReady` and `visibleByTestId` helpers. Identify which helpers use stale selectors and update them in `seeded-helpers.ts`. The PlaceDrawer itself (`data-testid="place-drawer"`) is likely still present — check `PlaceDrawer.tsx`.

### `social-url-ingest.spec.ts` — VERIFY AND FIX

**Intent:** URL paste input is visible in explore panel; ingest flow works.

This spec was written intentionally RED before S5b shipped. It references `paper-explore-panel` (correct selector). Run it first to see what's actually failing — it may need only minor fixes now that S5b is shipped.

---

## Key Paper Shell Selectors

Verify these before using — grep for `data-testid` in the component files listed above:

| Element | Expected testid or selector |
|---------|---------------------------|
| Explore shell | `data-testid="explore-shell"` (verify) |
| Planner shell | `data-testid="planner-shell"` (verify) |
| Map tab | `data-testid="paper-header-tab-map"` |
| Itinerary tab | `data-testid="paper-header-tab-itinerary"` |
| Sources tab | `data-testid="paper-header-tab-sources"` |
| Explore panel | `data-testid="paper-explore-panel"` |
| Place drawer | `data-testid="place-drawer"` (verify) |
| Inspector card | `data-testid="inspector-category-chips"` |

**Always grep the component file for the actual testid before writing an assertion.**

---

## Definition of Done

- [ ] `workspace-adaptive.spec.ts` deleted; `paper-shell-responsive.spec.ts` written and green
- [ ] All 5 remaining specs rewritten and green
- [ ] `npm run test:e2e` shows 0 failures (skipped tests for missing auth are acceptable in CI)
- [ ] `npm run check` passes
- [ ] `CONTEXT.md` updated: E2E test rewrite marked **Done** in Current Phase, moved to Previous
