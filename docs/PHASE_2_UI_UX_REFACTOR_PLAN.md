# Phase 2 UI/UX Refactor Plan (Split View + Mobile-first)

- Date: 2026-02-06
- Scope: Phase 2 map shell UI (overlays/drawers), not Kanban scheduling (P2-E1) or filter translation (P2-E2).

## Goal
Replace the current multi-overlay/drawer stack with a strict surface model:

- **Map canvas** (truth; always visible)
- **Context Panel** (primary “work surface”)
- **Tools Sheet** (secondary “settings/tools surface”)

While preserving URL-deep-link semantics and keeping mobile ergonomics first-class.

## Non-goals
- Re-enrichment or mutation of frozen enrichment.
- Schema changes or RLS changes.
- PMTiles protocol wiring.
- Scheduling/Kanban implementation (P2-E1).

## Current Pain Points (why now)
- Multiple simultaneous persistent overlays (left overlay, right overlay, list drawer, place drawer).
- Explicit layout coupling: right overlay height is measured and used to position the place drawer.
- Mobile clunk risk: stacking bounded windows becomes a “window manager” UX.

## Surface Model (Window Budget)

### Always
- Map canvas is present and interactive.

### Primary overlay: Context Panel
- The single bounded surface for “working context”.
- Modes: **Lists**, **Place**, **Search**, **Plan** (Search may remain in Omnibox initially).
- **Split view** happens *inside* the panel:
  - Left: Lists context
  - Right: Place context (approved place or preview/approve flow)

### Secondary overlay: Tools Sheet
- Transient utilities: Layers toggles, base map style, account actions.

### Budget rules
- **Mobile:** only one overlay open at a time (Context Panel OR Tools Sheet).
- **Desktop:** Context Panel docked + optional Tools Sheet (never 3 persistent surfaces).

### Mobile navigation (map-first)
- Prefer a bottom tab bar (Explore/Search, Lists, Plan) that switches Context Panel mode while keeping the map visible.
- Tabs are part of the map shell, not additional windows (details in `docs/UX_RULES.md`).

## URL + State Contract

### Canonical URL state
- `/?place=<id>` opens Place context (already canonical).
- Add `/?list=<id>` to represent active list selection.
- If both exist, Context Panel shows split view and list membership context.

### Fallback persistence
- Preserve the existing “sticky list” behavior via `localStorage` when `?list` is absent.
- If we auto-apply a stored list on load, prefer `router.replace(...)` to avoid polluting history.

### History semantics
- User-driven open/close of Place and user-driven list selection should create history entries (`push`).
- Auto-defaulting (localStorage fallback) should not (`replace`).

## Implementation Slices (B → E)

### Slice 1: Panel primitives (no behavior change)
- Add Context Panel chrome component (header + body scroll contract).
- Add Tools Sheet shell (transient, closeable).
- Introduce a simple breakpoint behavior (mobile sheet vs desktop dock).

### Slice 2: Context Panel v1 around existing content
- Desktop: mount a single bounded Context Panel container.
- Mobile: bottom sheet states (button-driven is OK v1; drag later).
- Mobile: a mode switcher row inside the sheet chrome (e.g., `Explore/Search`, `Lists`, `Plan`, `Details`) that swaps Context Panel content without stacking drawers.
- Keep Omnibox where it is for now to avoid scope creep.

### Slice 3: Extract List and Place content
- Refactor `ListDrawer` and `PlaceDrawer` so their internal content can render “embedded”
  (remove absolute positioning concerns when embedded).
- Preserve existing data flows and props; change only layout composition.

### Slice 4: Move preview/approve into Place context
- Render the preview/approve Inspector flow inside the Place side of the Context Panel.
- Preserve current approve behavior (approve → fetch places → focus place → set `?place=`).

### Slice 5: Tools Sheet replaces the right overlay stack
- Replace Sign out + Layers + base map style UI with a single Tools entrypoint.
- Enforce mutual exclusion with Context Panel on mobile.

## Testing Strategy (Playwright is paused)
- Prefer unit/integration tests for pure logic (URL-state utilities, state transitions).
- Manual smoke checklist for UI composition changes.
- If/when Playwright seeding is restored, add/update E2E assertions for:
  - `?place=` deep link
  - `?list=` deep link
  - mobile overlay mutual exclusion
  - desktop split view selection sync

## Acceptance Checks (Manual)
- Mobile: never end up with multiple persistent drawers stacked.
- Desktop: list+place split view exists inside one bounded panel.
- `?place=` deep link works; Back/Forward toggles open/close cleanly.
- Preview state is clearly not “saved” until approval succeeds.
- Switching to an empty list does not move the map camera.

## Decision Log (defaults)
- Desktop dock side default: **right** (minimizes churn; aligns with existing “context” placement).
- Playwright: treated as optional until deterministic seeding is restored.
