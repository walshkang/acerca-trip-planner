# Plan Page Rebuild — Slices

> Shape Up style: bounded slices, vertical cuts, escalating commitment.
> CalendarPlanner is a **clean-sheet UI layer** wired to existing `useTripStore` + API.

## Architecture Target

```
PlannerShell
├── PlannerToolbar (list switcher dropdown, view toggle, smart date picker)
├── MapInset (left, square — Slice 5)
└── CalendarPlanner (NEW — clean sheet)
    ├── CalendarGrid (3-day | week | 2-week)
    │   └── DayCell[] (draggable items, density indicator)
    ├── AgendaView (continuous scroll alternative)
    └── DayDetailPanel (right panel: Morning / Afternoon / Evening)
```

**Data layer (keep as-is):** `useTripStore`, `useNavStore`, API hooks, `day_index` schema, item model.

**View modes:** 3-day, week (default), 2-week, agenda. All interactive (drag between days).

## Slice 1 — Clean the Room

**Goal:** Strip non-planning chrome so the page feels focused.

- Remove "Destinations" and "Explore Map" from left sidebar in PlannerShell
- Remove "Collaborators Active" UI
- Remove "Generating Document" UI
- Clean omnibar: remove "Search Destinations" bar
- Add list switcher dropdown at top of PlannerShell with clear "Planning: {list name}" label
- Remove the inline list name + edit dates box from the grid area

**No new components. Pure subtraction + one dropdown.**

## Slice 2 — Calendar Grid (Week View)

**Goal:** Replace current day grid with a real calendar layout. Week view only.

- New `CalendarPlanner` component (clean sheet)
- New `CalendarGrid` renders 7-day week with day-of-week column headers (Mon–Sun)
- `DayCell` shows: date, item count, first ~3 item names as preview, density indicator (empty / light / packed)
- Selected day cell is visually highlighted
- Wire to `useTripStore` for item data
- Responsive: full grid on desktop, horizontal scroll or stacked on mobile

**This is the big swing. Get week view right before anything else.**

## Slice 3 — Day Detail Panel (Morning / Afternoon / Evening)

**Goal:** Selected day opens rich detail in right panel.

- New `DayDetailPanel` replaces current flat day detail
- Three sections: Morning, Afternoon, Evening
- Items auto-sort within sections: food/drink first, then activities/shopping
- Category icons on each item
- Drag-and-drop between sections (move item from Morning to Evening)
- Vibes-based time mapping: Morning = before noon, Afternoon = 12–5pm, Evening = after 5pm
- Desktop: persistent right panel (~400px). Mobile: full-screen overlay or bottom sheet.

**Deferred to later epic:** opening-hours warnings (needs enrichment data piped in).

## Slice 4 — View Toggles + Cross-Day Drag

**Goal:** Add remaining view modes and drag between day cells.

- View toggle in PlannerToolbar: 3-day | week (default) | 2-week | agenda
- 3-day: scrollable, shows 3 columns, swipe/arrow to shift window
- 2-week: 14-day grid, interactive (drag between days), cells smaller but still usable
- Agenda: continuous vertical scroll of all days (essentially current mobile layout, kept as fallback)
- Drag-and-drop items between DayCells across all views
- Visual feedback: ghost item, drop target highlight, density update on drop

## Slice 5 — Map Reposition + Smart Date Picker

**Goal:** Polish the layout and date UX.

- Move MapInset to left side, square aspect ratio, interactive (click pins, see day-colored markers)
- Smart date picker: end date picker knows start date (min constraint), cleaner calendar UI
- Layout becomes: Map (left, square) | CalendarGrid (center) | DayDetailPanel (right)

---

## What's NOT in these slices

- Clock-time scheduling (vibes only for now)
- Opening hours warnings (separate epic, needs enrichment data)
- Live collaboration
- Routing info / travel-time badges in planner
- Insights layer
- Export (Google Maps, PDF)
- Gemini API integration

## Cursor Handoff Notes

Each slice is a self-contained prompt for Cursor Composer. Key context:
- Existing data layer: `useTripStore.ts`, `useNavStore.ts` — read these first
- Current planner: `ListPlanner` (~815 LOC) in PlannerShell — being replaced, not modified
- Schema: `list_items` table has `day_index` (nullable int) for date assignment
- Component convention: Next.js app router, Tailwind, TypeScript
- See `CONTEXT.md` for full architecture, `DESIGN.md` for visual system
