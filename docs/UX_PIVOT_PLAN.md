# UX Pivot: Two-Journey Architecture

**Date:** 2026-03-22
**Scope:** Replace single WorkspaceContainer shell with Explore/Plan dual-journey architecture
**Status:** Planning — decisions locked, ready for implementation

---

## Decisions Log

These were resolved in conversation and are now locked. Do not re-litigate in implementation.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map in planning mode | Real Mapbox minimap inset with clickable pins | Spatial context matters too much for SVG dots |
| Minimap interactivity | Clickable pins scroll to item in planner | Bridges spatial + temporal views |
| Date mode | Real dates primary, Day 1/2/3 fallback when dateless | Keeps `scheduled_date` as source of truth |
| Journey transition | Explicit mode switch (Explore ↔ Plan) | Clear mental model, clean state boundaries |
| Mobile navigation | Persistent bottom footer (Explore / Plan) | Always-accessible, no hidden modes |
| Desktop navigation | Sidebar rail (icon-based, Linear/Figma style) | Extensible for future modes (insights, export) |
| Refactor strategy | Moderate: ExploreShell + PlannerShell, shared state layer | Minimizes agent confusion (tech debt = what confuses an agent) |
| Schema for dateless trips | `day_index` nullable integer on `list_items` | Derived from dates when present, direct when dateless, backfill on date-set |
| Insights layer | Separate epic, after planner is solid | Don't couple validation logic to planner v1 |

---

## Architecture: Before → After

### Before (current)
```
WorkspaceContainer (god component)
├── MapShell (full viewport)
├── Omnibox
├── InspectorCard
├── ContextPanel
│   ├── tab: Lists → ListDrawer
│   ├── tab: Plan → ListPlanner
│   └── tab: Details → PlaceDrawer
└── ToolsSheet
```

### After (target)
```
AppShell
├── NavRail (desktop) / NavFooter (mobile)
│   ├── Explore mode
│   └── Plan mode
├── ExploreShell
│   ├── MapShell (full viewport)
│   ├── Omnibox
│   ├── InspectorCard
│   ├── ContextPanel (lists, place details)
│   └── ToolsSheet
└── PlannerShell
    ├── PlannerGrid (primary surface)
    │   ├── Backlog
    │   ├── Day cells (drag-and-drop)
    │   └── Day detail (expanded selected day)
    ├── MapInset (real Mapbox, small, clickable pins)
    └── PlannerToolbar (trip dates, filters)
```

### Shared state layer
```
lib/state/
├── useTripStore.ts      (active list, items, trip dates — shared)
├── useDiscoveryStore.ts (search, preview — Explore only)
├── usePlannerStore.ts   (selected day, drag state — Plan only)
└── useNavStore.ts       (active mode, nav state — new)
```

---

## Schema Change

### Migration: `add_day_index_to_list_items`

```sql
ALTER TABLE list_items
  ADD COLUMN day_index integer;

-- Backfill for items that already have scheduled_date + a list with start_date
UPDATE list_items li
SET day_index = (li.scheduled_date - l.start_date)::integer
FROM lists l
WHERE li.list_id = l.id
  AND li.scheduled_date IS NOT NULL
  AND l.start_date IS NOT NULL;

-- Constraint: day_index >= 0 when set
ALTER TABLE list_items
  ADD CONSTRAINT day_index_non_negative CHECK (day_index IS NULL OR day_index >= 0);
```

### Derivation rules
- **Trip has dates:** `scheduled_date` is source of truth. `day_index = scheduled_date - start_date`. Write path sets `scheduled_date`; a trigger or application-layer derives `day_index`.
- **Trip is dateless:** `day_index` is source of truth. `scheduled_date` stays NULL. Write path sets `day_index` directly.
- **User sets dates on a dateless trip:** Backfill `scheduled_date = start_date + day_index` for all items with non-null `day_index`. One-time operation on the `PATCH /api/lists/[id]` endpoint when `start_date` transitions from NULL to a value.
- **User removes dates from a dated trip:** Backfill `day_index = scheduled_date - start_date` for all items, then NULL out `scheduled_date`. One-time operation.

### API changes
- `PATCH /api/lists/[id]/items/[itemId]` accepts `day_index` as alternative to `scheduled_date`.
- Response always includes both `scheduled_date` and `day_index` (one may be null).

---

## Implementation Phases

### Phase 0: Foundation (Deep tier — do first)

**Goal:** Schema migration + shared state extraction + nav primitives. No visible UI change yet.

**Tasks:**

1. **Schema migration** — Add `day_index` column, backfill, constraint. Run `npm run db:types`.
2. **Extract shared trip state** — Factor `useTripStore` out of WorkspaceContainer's inline state. This store holds: `activeListId`, `items`, `list` (summary with dates), `activeListPlaceIds`, `activeListItems`. Both shells will consume it.
3. **Create `useNavStore`** — Tiny Zustand store: `{ mode: 'explore' | 'plan', setMode }`. Drives which shell renders.
4. **Update scheduling write path** — `PATCH /api/lists/[id]/items/[itemId]` accepts `day_index`. When list has dates, also computes `scheduled_date`. When dateless, leaves `scheduled_date` null.
5. **Update trip date write path** — `PATCH /api/lists/[id]` backfills `day_index ↔ scheduled_date` when dates are added or removed.
6. **Update `places_view` / queries** — Ensure `day_index` is returned alongside `scheduled_date` in all item queries.

**Verify:** `npm run check`, `npm test`, existing E2E still pass (no UI change yet).

---

### Phase 1: Shell Split (Deep tier)

**Goal:** Introduce AppShell + NavRail/NavFooter. ExploreShell wraps existing behavior. PlannerShell is a skeleton.

**Tasks:**

1. **Create `AppShell`** — New top-level component in `components/app/AppShell.tsx`. Reads `useNavStore.mode`, conditionally renders ExploreShell or PlannerShell.
2. **Create `ExploreShell`** — Move current WorkspaceContainer logic here wholesale. It IS the old WorkspaceContainer, renamed and scoped. No refactor of internals yet.
3. **Create `PlannerShell` skeleton** — Renders a placeholder with the trip name. Consumes `useTripStore` for the active list.
4. **Create `NavRail` (desktop)** — Vertical icon rail, left edge. Two icons: map/compass (Explore) and calendar/grid (Plan). Highlights active mode.
5. **Create `NavFooter` (mobile)** — Persistent bottom bar, same two options. Sits below the bottom sheet.
6. **Wire URL state** — `?mode=plan` or `?mode=explore`. Default to `explore`. `useNavStore` reads/writes this.

**Verify:** App loads, Explore mode works exactly as before, Plan mode shows skeleton, switching works on both breakpoints.

---

### Phase 2: Planner Core (Deep tier plans, Bounded tier executes grid)

**Goal:** Build the day grid planner as the primary surface in PlannerShell.

**Tasks:**

1. **Design PlannerShell layout:**
   - Desktop: `[NavRail] [PlannerGrid (70%)] [MapInset (30%)]`
   - Mobile: `[PlannerGrid (full)] [MapInset (small, top strip or corner)]` + NavFooter
2. **Build `PlannerGrid` component** — New component (not reusing ListPlanner). Reads from `useTripStore`.
   - Backlog section (top/side)
   - Day cells in calendar grid (7-per-row when dated, horizontal scroll when dateless)
   - Selected day detail panel (desktop: right side; mobile: expand or navigate)
   - Uses `@dnd-kit` for drag between cells
3. **Build `PlannerDayCell` component** — Compact cell showing day label + ordered place names with time-of-day color dots.
4. **Build `PlannerDayDetail` component** — Expanded view of one day. Drag-to-reorder. Richer place cards.
5. **Build `PlannerBacklog` component** — Filterable list of unassigned items. Drag from here to day cells.
6. **Wire scheduling writes** — Drag fires `PATCH /api/lists/[id]/items/[itemId]` with `day_index` (dateless) or `scheduled_date` (dated). Optimistic UI with rollback.
7. **Mobile: tap-to-move fallback** — Reuse existing `PlannerMovePicker` pattern for mobile when drag is imprecise.

**Verify:** Can create a trip, add places, set dates, drag places between days, reorder within a day. Dateless mode uses Day 1/2/3 labels.

---

### Phase 3: Map Inset (Deep tier)

**Goal:** Real Mapbox minimap in the PlannerShell with clickable pins.

**Tasks:**

1. **Create `MapInset` component** — Wraps a second Mapbox GL instance at small size. Read-only (no Omnibox, no overlays). Shows pins for items in the selected day (or all days with day-colored clusters).
2. **Pin click → planner scroll** — Clicking a pin in the inset calls `usePlannerStore.scrollToItem(placeId)`, which the PlannerGrid/DayDetail responds to.
3. **Selected day → map bounds** — When the user selects a day in the grid, the inset fits bounds to that day's pins. When no day is selected, fits all pins.
4. **Memory management** — Lazy-mount the Mapbox instance only when PlannerShell is active. Destroy on mode switch to Explore to avoid two GL contexts.
5. **Mobile layout** — MapInset as a small strip (120px tall) above the planner grid. Expandable to 40vh with a drag gesture.

**Verify:** Pins render correctly, clicking a pin highlights the right item, day selection updates bounds, memory doesn't leak on mode switch.

---

### Phase 4: Polish + Cleanup (Bounded tier)

**Goal:** Visual polish, cleanup dead code, update docs.

**Tasks:**

1. **Visual system for planner** — Apply design tokens (time-of-day dot colors, day cell styling, capacity warnings). Respect light/dark tone.
2. **Deprecate old ListPlanner** — Once PlannerGrid is stable, remove `components/stitch/ListPlanner.tsx` and its sub-components (`PlannerDayGrid`, `PlannerDayDetail`, `PlannerBacklog`, `PlannerMovePicker`). The new versions live in `components/planner/`.
3. **Remove WorkspaceContainer** — It's now `ExploreShell`. Delete the old file, update imports.
4. **Update DESIGN.md** — Rewrite Sections B and C to reflect the two-journey architecture, NavRail/NavFooter, MapInset, PlannerShell layout.
5. **Update CONTEXT.md, roadmap.json, AGENTS.md** — Align all docs.
6. **E2E tests** — Update Playwright for new nav structure, planner grid selectors.

---

## Claude Code Prompting Strategy

Below are ready-to-use prompts for each phase. They follow your `prompts/agent_task.md` pattern and reference the right files.

### Prompt 1: Schema + State Foundation (Phase 0)

```
## Task: Add day_index schema + extract shared trip state

**Read first:**
- AGENTS.md, DESIGN.md, CONTEXT.md
- docs/PHASE_2_KANBAN_SPEC.md (current scheduling data model)
- components/workspace/WorkspaceContainer.tsx (state to extract)
- lib/state/useDiscoveryStore.ts (pattern for Zustand stores)

**Goal:**
1. Create migration `add_day_index_to_list_items.sql`:
   - Add nullable `day_index integer` to `list_items`
   - Backfill from existing `scheduled_date` where lists have `start_date`
   - Add CHECK constraint: `day_index IS NULL OR day_index >= 0`
   - Run `npm run db:types`

2. Extract `useTripStore` from WorkspaceContainer:
   - New file: `lib/state/useTripStore.ts`
   - State: `activeListId`, `list` (ListSummary), `items` (ListItemRow[]),
     `activeListPlaceIds`, `activeListItems`, `fetchItems()`, `setActiveListId()`
   - This is a MOVE, not a copy. WorkspaceContainer should import from useTripStore.
   - Do not change any behavior — just extract.

3. Create `useNavStore`:
   - New file: `lib/state/useNavStore.ts`
   - State: `mode: 'explore' | 'plan'`, `setMode(mode)`
   - Read initial mode from URL `?mode=` param, default 'explore'

4. Update PATCH /api/lists/[id]/items/[itemId]:
   - Accept optional `day_index` in request body
   - When list has start_date and day_index is provided: compute
     scheduled_date = start_date + day_index days
   - When list has no start_date: store day_index, leave scheduled_date null
   - Always return both fields in response

5. Update PATCH /api/lists/[id] (trip dates):
   - When start_date transitions NULL→value: backfill scheduled_date
     from day_index for all items
   - When start_date transitions value→NULL: backfill day_index from
     scheduled_date, then null out scheduled_date

**Constraints:**
- Do not modify any UI components beyond WorkspaceContainer state extraction
- Follow existing migration naming convention in supabase/migrations/
- Follow existing Zustand store patterns (useDiscoveryStore.ts)
- All existing tests must continue to pass

**Verify:**
- npm run check
- npm test
- Manual: existing planner still works identically
```

### Prompt 2: Shell Split (Phase 1)

```
## Task: Introduce AppShell + ExploreShell/PlannerShell + navigation

**Read first:**
- AGENTS.md, DESIGN.md
- UX_PIVOT_PLAN.md (this document — architecture section)
- components/workspace/WorkspaceContainer.tsx (becomes ExploreShell)
- lib/state/useNavStore.ts (created in Phase 0)
- components/ui/ContextPanel.tsx (pattern for responsive layout)

**Goal:**
1. Create `components/app/AppShell.tsx`:
   - Reads useNavStore().mode
   - Renders ExploreShell when mode='explore', PlannerShell when mode='plan'
   - Mounts NavRail (desktop >= 768px) or NavFooter (mobile < 768px)

2. Create `components/app/ExploreShell.tsx`:
   - Rename/move WorkspaceContainer here
   - Exact same behavior, just scoped name
   - Consumes useTripStore instead of inline state

3. Create `components/app/PlannerShell.tsx` (skeleton):
   - Shows active trip name from useTripStore
   - Placeholder text: "Planner coming soon"
   - Correct layout skeleton: grid area for planner + map inset

4. Create `components/app/NavRail.tsx` (desktop):
   - Vertical rail, left edge, 56px wide
   - Two icons: compass/map (Explore), calendar (Plan)
   - Active state highlight
   - Use lucide-react icons
   - Follows design principles from DESIGN.md Section D

5. Create `components/app/NavFooter.tsx` (mobile):
   - Horizontal bar, bottom edge, 56px tall
   - Same two options as NavRail
   - Must sit BELOW the ContextPanel bottom sheet (z-index budget)
   - Persistent — never hidden by sheet state

6. Update URL state:
   - ?mode=explore (default) or ?mode=plan
   - NavRail/NavFooter clicks update URL + useNavStore
   - Back/forward browser navigation works

**Constraints:**
- ExploreShell must be a pure rename — no behavior changes
- NavFooter must not conflict with existing bottom sheet
- Do not touch ListPlanner, ListDrawer, or any stitch components
- Preserve all existing data-testid attributes

**Verify:**
- npm run check
- App loads in Explore mode identically to current behavior
- Clicking Plan shows skeleton PlannerShell
- Switching modes works on both desktop and mobile
- URL updates correctly, browser back works
```

### Prompt 3: Planner Grid (Phase 2)

```
## Task: Build PlannerGrid — the primary planning surface

**Read first:**
- AGENTS.md, DESIGN.md Section C (day grid spec)
- UX_PIVOT_PLAN.md (this document)
- lib/lists/planner.ts (existing planner utilities — reuse)
- lib/state/useTripStore.ts (data source)
- components/stitch/ListPlanner.tsx (reference for scheduling logic, but DO NOT modify)

**Goal:**
Build the new planner as a clean-sheet implementation in components/planner/.
Do NOT modify the existing ListPlanner — it stays working in ExploreShell
until Phase 4 cleanup.

1. Create `components/planner/PlannerGrid.tsx`:
   - Reads items + list from useTripStore
   - Layout: Backlog (top) + Day grid (below) + Day detail (right on desktop)
   - When trip has dates: grid shows real dates, 7 per row, calendar layout
   - When trip is dateless: grid shows Day 1, Day 2, etc., horizontal layout
   - Day cells show: label + ordered place names with time-of-day color dots
   - Drag-and-drop via @dnd-kit between cells and backlog
   - Selected day state in usePlannerStore

2. Create `lib/state/usePlannerStore.ts`:
   - selectedDay: string | number | null (ISO date or day_index)
   - dragState: { itemId, sourceDay, ... } | null
   - scrollToItemId: string | null (for map inset → planner scroll)

3. Create `components/planner/DayCell.tsx`:
   - Compact cell: day label + max 5 visible items + overflow indicator
   - Drop target for @dnd-kit
   - Click to select (sets selectedDay)
   - Soft capacity warning at >5 items
   - Color-coded dots: warm (morning), neutral (afternoon), cool (evening)

4. Create `components/planner/DayDetail.tsx`:
   - Full ordered list for selected day
   - Drag to reorder within day
   - Richer cards: category emoji, place name, time-of-day, tags
   - Desktop: right panel. Mobile: navigate to detail subview

5. Create `components/planner/Backlog.tsx`:
   - All items with day_index=null AND scheduled_date=null
   - Filterable by category
   - Drag source for @dnd-kit
   - Also shows assigned items with day indicator (for full context)

6. Wire scheduling writes:
   - Drop on day cell → PATCH with day_index (dateless) or scheduled_date (dated)
   - Drop on backlog → PATCH with day_index=null, scheduled_date=null
   - Reorder within day → PATCH with updated scheduled_order
   - All writes are optimistic with rollback on error
   - Reuse scheduling logic from lib/lists/planner.ts where possible

7. Mobile: show PlannerMovePicker when drag is imprecise
   - Reuse the pattern from the existing PlannerMovePicker
   - Tap item → pick destination day → confirm

**Constraints:**
- New components go in components/planner/, not components/stitch/
- Do not modify existing ListPlanner or its sub-components
- Follow @dnd-kit patterns already in the codebase
- Reuse lib/lists/planner.ts utilities (slotFromScheduledStartTime, etc.)
- Add data-testid attributes per DESIGN.md Section F conventions

**Verify:**
- npm run check
- Switch to Plan mode, see day grid with real data
- Drag a place from backlog to a day cell — persists on refresh
- Drag between days — persists on refresh
- Reorder within a day — persists
- Dateless trip shows Day 1/2/3 labels
- Mobile: tap-to-move works as fallback
```

### Prompt 4: Map Inset (Phase 3)

```
## Task: Add real Mapbox minimap inset to PlannerShell

**Read first:**
- AGENTS.md, DESIGN.md
- UX_PIVOT_PLAN.md (this document — Phase 3 section)
- components/map/MapShell.tsx (existing map implementation)
- components/map/MapView.mapbox.tsx (Mapbox GL usage patterns)
- lib/state/usePlannerStore.ts (scrollToItemId, selectedDay)
- lib/state/useTripStore.ts (items with lat/lng)

**Goal:**
1. Create `components/planner/MapInset.tsx`:
   - Small Mapbox GL instance (not a second MapShell — lighter weight)
   - Renders pins for places in the active trip
   - Desktop: 30% width, right side of PlannerShell (or below DayDetail)
   - Mobile: 120px tall strip above PlannerGrid, expandable to 40vh

2. Pin rendering:
   - All trip pins visible, colored by day assignment
   - Unassigned (backlog) pins in muted gray
   - Selected day's pins highlighted / others dimmed

3. Interactivity:
   - Click pin → set usePlannerStore.scrollToItemId → PlannerGrid scrolls to item
   - Selected day changes → map fitBounds to that day's pins
   - No day selected → fitBounds to all pins
   - No Omnibox, no overlays, no InspectorCard in this context

4. Lifecycle:
   - Lazy mount: only create Mapbox instance when PlannerShell is active
   - Destroy on switch to ExploreShell (avoid two GL contexts in memory)
   - Use the same Mapbox access token and style as the main map

5. Mobile expand/collapse:
   - Default: 120px strip with pins visible
   - Drag gesture or tap to expand to 40vh
   - Collapse back on tap or drag down

**Constraints:**
- Do not import or reuse MapShell (it carries too much chrome)
- DO reuse MapView.mapbox.tsx renderer if it can be parameterized,
  or create a lighter MapInsetView.tsx
- Pin styling should match existing pin styles from MapShell
- Must respect prefers-reduced-motion for animations

**Verify:**
- npm run check
- Plan mode shows minimap with correct pins
- Click pin → planner scrolls to that item
- Select a day → map zooms to those pins
- Switch to Explore → no memory leak (check browser devtools)
- Mobile: expand/collapse works
```

---

## What NOT to Build Yet

These are explicitly deferred. Do not scope-creep:

- **Insights layer** (distance warnings, closed-day alerts) — separate epic after planner is solid
- **Gemini API integration** — depends on insights layer
- **Export** (Google Maps, PDF) — Phase 3 roadmap item
- **Multi-trip views** — future feature
- **Collaborative editing** — future feature
- **Visual system overhaul** (glass → opaque) — can happen in parallel but is orthogonal

---

## Doc Updates Needed

After implementation, update these files:
- `DESIGN.md` — Sections A (add two-journey model), B (AppShell + NavRail/NavFooter layout), C (PlannerGrid in PlannerShell, not ContextPanel tab), E (new component inventory)
- `CONTEXT.md` — Active phase, new architecture description
- `roadmap.json` — Add P3-E3 tasks for each phase above
- `AGENTS.md` — Update task routing (PlannerShell orchestration = Deep tier)
- `docs/PHASE_2_KANBAN_SPEC.md` — Mark as fully superseded (was partially superseded)
