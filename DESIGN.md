# Acerca Trip Planner — Design System & UX Spec

This is the **single source of truth** for UI/UX decisions. A coding agent should be able to read this document and the component code, then make correct, consistent changes across the entire interface without further clarification.

Related docs (subordinate to this file for UI/UX decisions):
- `docs/SIGNAL_VISUAL_LANGUAGE.md` — state semantics (focus, dim, ghost, error)
- `docs/COPY_TONE.md` — microcopy vocabulary and tone
- `docs/UX_RULES.md` — surface model and device rules

---

## A. Product context

### Who is the user
A tech-savvy traveler (think MBA, product manager, or senior IC) who:
- Is used to clean, minimal interfaces (Linear, Notion, Arc)
- Plans trips by gathering recommendations from friends, blogs, Google Maps, and AI research
- Wants to organize places into a schedule and **pivot quickly** when plans change (weather, new discoveries, mood)
- Needs this to work well on a phone while standing on a sidewalk

### Core user journey
1. **Research** — gather place recommendations from various sources
2. **Add** — paste a Google Maps link or search → preview → approve to pin on the map
3. **Organize** — add approved places to a trip list
4. **Plan** — set trip dates, then assign places to days using the day grid planner
5. **Pivot** — quickly move places between days (or back to backlog) when plans change

### The pain point we solve
Other trip planning tools make it easy to *add* places but hard to *reschedule* them. When it rains, when you discover a new spot, when dinner runs long — you need to move things around fast. The day grid planner is designed for this: see your whole trip at a glance, drag a place from Tuesday to Thursday in one gesture.

### One trip, one list
A list represents a single trip. Each list has its own start/end dates, timezone, and set of places. Users do not merge lists or share places across trips (duplication may come later).

---

## B. App shell & layout

### Desktop (>= 768px)

```
┌──────────────────────────────────────────────────┬──────────────────────┐
│                                                  │                     │
│  [Omnibox]                        [Tools] [WS]   │   Context Panel     │
│                                                  │   (resizable)       │
│                  MAP                             │                     │
│                                                  │   Split: List | R   │
│                                                  │                     │
│                                                  │                     │
└──────────────────────────────────────────────────┴──────────────────────┘
```

- **Map** fills the viewport behind everything
- **Omnibox** pinned top-left (z-70), always visible
- **Tools button** + **Workspace button** pinned top-right (z-80)
- **Context Panel** docked right, resizable via drag handle
  - Snap widths: 360px (compact), 520px (medium), 760px (wide)
  - Persisted to localStorage
  - Internal split: left pane (list) + right pane (details/plan)
- When the planner is active, it can take over more screen real estate (see Section C)

### Mobile (< 768px)

```
┌──────────────────────────┐
│ [Omnibox]    [Tools] [WS]│
│                          │
│           MAP            │
│                          │
├──────────────────────────┤  ← grab bar
│                          │
│     Context Panel        │
│     (bottom sheet)       │
│                          │
│  [Lists] [Plan] [Details]│  ← tab bar
└──────────────────────────┘
```

- **Bottom sheet** with snap points: peek (120px), half (50vh), expanded (85vh)
- **Grab bar** with `role="separator"`, `aria-orientation="horizontal"`
- **Tab bar** at the bottom of the sheet: Lists / Plan / Details
- Only one overlay at a time: Context Panel OR Tools Sheet (never both)
- URL-driven state (`?place=`, `?list=`) takes priority over local Tools state

### Overlay stack (z-index budget)
1. Map canvas (z-0)
2. Map overlay left — Omnibox (z-70)
3. Map overlay right — Tools + Workspace buttons (z-80)
4. Context Panel (managed by ContextPanel component)
5. Tools Sheet (transient, above Context Panel)
6. Toasts (highest)

### Planning mode (planner active)

When the user enters the Plan tab:
- **Desktop:** the planner grid can expand to take more horizontal space. The map remains visible but may be narrower. Consider allowing the context panel to grow beyond 760px, or offering a "focus" mode where the planner occupies ~70% of the viewport with the map as a narrow strip or small inset.
- **Mobile:** the planner occupies the full sheet body. The map peeks above the sheet. The compact day grid is designed to fit on a phone screen.

The map is still useful during planning as a spatial reference (seeing where Tuesday's places cluster geographically), so it should remain accessible — not hidden entirely.

---

## C. The planner (day grid)

This section supersedes `docs/PHASE_2_KANBAN_SPEC.md` for planner UI/UX decisions. The backend data model (slot sentinels, fractional ordering, API contract) from that spec remains valid.

### Mental model

The planner is a **compact day grid**, not a traditional kanban board with tall columns. Think of it as a calendar view where each cell is a day of the trip and contains a small stack of place cards.

### Grid layout

```
         Mon    Tue    Wed    Thu    Fri    Sat    Sun
Week 1  [ 3 ]  [ 4 ]  [ 5 ]  [ 2 ]  [ 5 ]  [ 4 ]  [ 3 ]
Week 2  [ 4 ]  [ 3 ]  [ — ]
```

- Each day of the trip is a **compact cell** in a grid
- Rows contain up to 7 days (like a calendar)
- A 7-day trip = one row. A 14-day trip = two rows. A 3-day trip = one short row.
- Each cell shows: day label (e.g., "Tue Mar 24") + a compact stack of place items
- Empty days show a subtle empty state (dashed border or muted placeholder)

### Backlog

- A **pinned section** above or beside the grid
- Contains all places in the list that are not yet assigned to a day (`scheduled_date IS NULL`)
- Also shows already-assigned items (with a visual indicator of which day they're on) so the user has full context
- Filterable by category, tags, or search

### Day cell contents

Each cell contains an ordered vertical list of places for that day:

```
┌─ Tue Mar 24 ──────┐
│ ● Cafe Latte       │  ← warm dot (morning)
│ ● Tsukiji Market   │  ← warm dot (morning)
│ ● TeamLab          │  ← neutral dot (afternoon)
│ ● Ichiran Ramen    │  ← cool dot (evening)
│ ● Bar High Five    │  ← cool dot (evening)
└────────────────────┘
```

- Each place shows: color dot (time-of-day hint) + place name
- **Vertical order matters**: breakfast at top, drinks at bottom
- Color coding for time-of-day (replaces Morning/Afternoon/Evening sub-sections):
  - Morning slots → warm tone (amber/orange dot)
  - Afternoon slots → neutral tone (slate/gray dot)
  - Evening slots → cool tone (indigo/blue dot)
- This keeps the cell visually clean — flat list with color hints, no section headers

### Drag interactions

- **Drag a place** from any cell to any other cell (reassigns the day)
- **Drag a place** to/from the backlog
- **Drag to reorder** within a day (changes the vertical position)
- On mobile: drag distances are short (cell to cell) because the grid is compact
- On desktop: same drag behavior, just more space

### Capacity and warnings

- Typical day: 3-5 places (breakfast, lunch, activity, dinner, drinks)
- When a day cell exceeds ~5 items, show a **soft warning** (e.g., subtle highlight on the cell, tooltip "This day is getting full") with option to proceed
- Multiple items can legitimately fit in one time slot (e.g., two afternoon activities)

### Trip date changes

- **Adding days**: blank cells appear at the end of the grid
- **Reducing days**: warn the user and ask which days to keep/remove
  - Places on removed days automatically return to backlog
  - This must be explicit — never silently discard scheduled items

### Desktop expanded layout

When a user taps/clicks a day cell on desktop:

```
┌────────────────────────────────┬──────────────────────────────┐
│                                │                              │
│   Day Grid (compact)           │   Selected Day Detail        │
│   (all days visible)           │   (full ordered list)        │
│                                │   - drag to reorder          │
│   [Backlog pinned above]       │   - place cards with more    │
│                                │     info (category, tags)    │
│                                │                              │
└────────────────────────────────┴──────────────────────────────┘
```

- Grid on the left showing the full trip overview
- Selected day expanded on the right with the full ordered list of places
- Within the expanded day: drag-to-reorder, richer place cards (category icon, tags, time-of-day color)

### Mobile planner layout

- The compact grid fits in the bottom sheet body
- Tapping a day cell could either:
  - Expand the cell inline (push other cells down), or
  - Navigate to a day detail subview (with a back gesture to return to the grid)
- The grid should be scrollable if the trip spans many weeks, but most trips (1-2 weeks) should fit without scrolling

### Data model (unchanged)

The backend data model from `docs/PHASE_2_KANBAN_SPEC.md` remains valid:
- `scheduled_date` — which day (NULL = backlog)
- `scheduled_start_time` — slot sentinel (09:00 / 14:00 / 19:00) drives the time-of-day color
- `scheduled_order` — fractional ordering within a day
- `completed_at` — marks done (NULL = not done)
- Moves write via `PATCH /api/lists/[id]/items/[itemId]`

---

## D. Visual system

> **Status: open for revision.** The current glass/frosted aesthetic may or may not be the right fit for the ICP. This section should be updated once the visual direction is decided.

### Current state (glass system)

The existing implementation uses CSS custom properties and glass utility classes defined in `app/globals.css`. These are documented here for reference but are **not locked in**:

**CSS variable tokens** (dark default, light overrides via `[data-map-tone='light']`):

| Token group | Role |
|-------------|------|
| `--glass-panel-*` | Panel backgrounds, borders, shadows |
| `--glass-button-*` | Primary chrome buttons |
| `--glass-input-*` | Form fields |
| `--glass-coin-*` | Circular map-adjacent controls |
| `--glass-tab-*` | Tab pill states |
| `--focus-link-ring` | Focus-visible ring |

**Utility classes**: `.glass-panel`, `.glass-button`, `.glass-input`, `.glass-tab`, `.glass-tab-active`, `.glass-tab-inactive`, `.glass-coin`, `.glass-coin-interactive`

### Design principles (regardless of visual direction)

1. **Map is the visual anchor** — overlays sit on top of the map and should not visually overpower it
2. **Readability over aesthetics** — text and controls must be legible over both light and dark map styles
3. **Semantic color only** — every color choice maps to a meaning (focus, time-of-day, state). No decorative color.
4. **Compact density** — prefer `text-xs` / `text-sm`, tight spacing. The ICP is comfortable with information-dense interfaces.
5. **Calm motion** — subtle transitions only. Respect `prefers-reduced-motion`.

### Light / dark tone

- The app supports light and dark map styles
- UI tone (`data-map-tone="light"` or `"dark"`) is derived from the base map selection
- All overlay components must work in both tones

### What the next visual pass should decide

- Whether glass/frosted is the right metaphor for this ICP, or if a cleaner opaque style (think Linear's panels) would be better
- The specific color palette for time-of-day dots in the planner
- Whether the planner grid cells need a distinct visual treatment from the rest of the overlay system
- Button and control styling — rounded-full (current) vs. more angular

---

## E. Component inventory

Each component's purpose and key affordances. When modifying a component, preserve its role and affordances unless DESIGN.md is updated first.

### Map layer

| Component | Location | Purpose |
|-----------|----------|---------|
| `MapShell` | `components/map/MapShell.tsx` | Pure map: auth, place fetching, fly-to, bounds fitting, marker rendering. No UI chrome. Exposes `fetchPlaces()` via ref. |
| `MapView.mapbox` / `MapView.maplibre` | `components/map/` | Map renderer (provider-specific). Receives places, overlays, and callbacks. |

### Workspace shell

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkspaceContainer` | `components/workspace/WorkspaceContainer.tsx` | Top-level orchestrator. Owns all app state (active list, panel mode, drawer open, map style, preview state). Mounts MapShell + all overlays. |
| `ContextPanel` | `components/ui/ContextPanel.tsx` | The single "working surface" — docked right panel on desktop, bottom sheet on mobile. Supports split layout (left/right panes) or single layout. |
| `ToolsSheet` | `components/ui/ToolsSheet.tsx` | Transient overlay for layers, base map style, sign out. Mutually exclusive with Context Panel on mobile. |

### Stitch components (presentation layer)

These live in `components/stitch/` and are wired by `WorkspaceContainer`. They contain both presentation and state logic.

| Component | Purpose | Key affordances |
|-----------|---------|-----------------|
| `Omnibox` | Search bar pinned top-left. Accepts Google Maps URLs, place IDs, or text search. Shows results dropdown. | Always visible. Triggers discovery flow (search → preview → approve). |
| `InspectorCard` | Preview card for a place candidate (ghost pin). Shows frozen enrichment before approval. | "Approve" commits to truth. "Close" discards. Only renders when preview state exists. |
| `ListsPanel` | List selector — shows all user's lists, allows create/delete. | Rendered in the left pane of the Context Panel. Selecting a list activates it. |
| `ListDetailBody` | Scrollable list of places within the active list. Supports search, tag/type filters. | Place rows are tappable (opens detail + pans map). Focused row gets glow treatment. |
| `ListDetailPanel` | Wrapper that combines ListsPanel + ListDetailBody with list-level actions. | Handles list switching, place ID tracking, filter state. |
| `ListDrawer` | Full list experience — combines list selection, detail, filtering, and local search. | The main "Lists" view in the Context Panel. |
| `ListPlanner` | **To be redesigned.** Currently a column-based kanban. Will become the day grid planner described in Section C. | Trip date editing. Drag-and-drop scheduling. Day/slot assignment. Move picker (mobile). |
| `PlaceDrawer` | Detail view for an approved place. Shows enrichment data, user notes, tags, list membership. | Rendered in "Details" mode. Close returns to previous panel mode. |
| `PlaceListMembershipEditor` | Add/remove a place from lists. | Rendered within PlaceDrawer. Add/remove semantics (not move). |
| `PlaceListTagsEditor` | Edit tags on a list item. | Rendered within PlaceDrawer when viewing a place in list context. Comma-separated input, per-chip remove. |
| `PlaceUserMetaForm` | Edit user notes on a place. | Rendered within PlaceDrawer. Separate from frozen enrichment. |

---

## F. Playwright E2E selector contract

Do **not** break these without updating [`tests/e2e/`](tests/e2e/).

### `data-testid` (must preserve when present)

- `context-panel-desktop`, `desktop-resize-handle`
- `context-panel-mobile`, `mobile-grab-bar`
- `list-drawer`, `list-planner`, `planner-move-picker`
- `place-drawer`
- `map-overlay-left`, `map-overlay-right`
- `local-search-results`

### Accessible names / labels / placeholders

Used via `getByRole`, `getByLabel`, `getByPlaceholder`:

- Buttons: **Workspace**, **Hide workspace**, **Tools**, **Close**
- Checkboxes: **Transit lines**, **Neighborhoods**, **Stations** (when applicable)
- Placeholder: **Add tags (comma-separated)**, **Search approved places**, Omnibox: **Paste Google Maps link or search...**

### Structure / ARIA

- Mobile sheet grab bar: `role="separator"`, `aria-orientation="horizontal"`
- Desktop resize handle: `role="separator"`, `aria-orientation="vertical"`, `aria-label="Resize workspace panel"` (if present)

### Stacking

- Keep **place drawer** visually below **map-overlay-right** (E2E compares bounding boxes). Avoid raising embedded drawer stacking above the right overlay column without updating tests.

### Other selectors

- List rows may use `data-place-id="{id}"` for map-to-list focus tests
- Map markers: `getByRole('button', { name: 'Open {placeName}' })`
- Planner: visible `button.glass-tab` with text **Plan** for tab switching; draggable cards use `draggable="true"` with expected copy (**Backlog**, **Done**, etc.)
- Day grid (new): add `data-testid="planner-day-grid"` on the grid container, `data-testid="planner-day-cell"` + `data-day="{YYYY-MM-DD}"` on each day cell, `data-testid="planner-backlog"` on the backlog section

### New interactive elements

When adding controls, add stable `data-testid` on primary actions (buttons, inputs, list rows, tabs) to keep E2E targetable.
