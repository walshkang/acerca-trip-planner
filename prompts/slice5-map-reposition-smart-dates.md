# Slice 5 — Map Reposition + Smart Date Picker

## Goal

Two independent polish improvements to the Plan page layout:
1. **Map reposition** — move the MapInset from a thin horizontal strip above the calendar to a square panel on the left side, creating a 3-column layout: Map | Calendar | Day Detail.
2. **Smart date picker** — replace the raw `<input type="date">` fields in PlannerTripDates with a smarter UX where the end date knows the start date (min constraint), and the display is cleaner.

## Context

Read these files first:
- `components/app/PlannerShellPaper.tsx` — current shell layout (map is 180px horizontal strip above CalendarPlanner)
- `components/planner/CalendarPlanner.tsx` — the planner (currently takes full width, has internal split: calendar left + day detail right 400px)
- `components/stitch/planner/PlannerTripDates.tsx` — current date editor with raw date inputs
- `components/map/MapInset.dynamic.tsx` — the lazy-loaded MapInset component (check its props)
- `DESIGN.md` — design tokens

## Part 1: Map Reposition

### Current layout
```
PlannerShellPaper
├── PaperHeader (fixed top)
├── PlannerListSwitcher (toolbar)
├── MapInset (180px horizontal strip, full width)
└── CalendarPlanner (flex-1)
    ├── Left: calendar grid + backlog + done (flex-1, scrollable)
    └── Right: day detail panel (400px, scrollable)
```

### Target layout
```
PlannerShellPaper
├── PaperHeader (fixed top)
├── PlannerListSwitcher (toolbar)
└── Content area (flex-1, horizontal flex)
    ├── MapInset (left, square ~350px, sticky/fixed height)
    ├── CalendarPlanner (center, flex-1)
    │   ├── calendar grid + backlog + done (scrollable)
    └── Day detail panel (right, 400px, scrollable)
```

### Modified file: `components/app/PlannerShellPaper.tsx`

Change the layout from vertical stack to horizontal flex:

```tsx
return (
  <div className="flex h-screen flex-col bg-paper-surface">
    <PaperHeader ... />
    <div className="flex items-center px-6 pt-20 pb-2">
      <PlannerListSwitcher />
    </div>
    {/* Main content: Map | Calendar+Backlog | DayDetail */}
    <div className="flex flex-1 min-h-0 px-6 pb-4 gap-4">
      {/* Map — square, left side */}
      <div className="w-[350px] shrink-0 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed">
        <MapInset
          className="h-full w-full"
          places={mapPlaces}
          activeListItems={activeListItems}
          selectedDay={plannerSelectedDay}
          onPinClick={onPinClick}
        />
      </div>
      {/* Planner content */}
      <div className="flex-1 min-w-0 min-h-0">
        <CalendarPlanner listId={activeListId} onPlanMutated={bumpListItemsRefresh} />
      </div>
    </div>
  </div>
)
```

Key changes:
- Remove the `h-[180px]` horizontal map strip
- Map becomes a `w-[350px]` left column that fills the available height (square-ish, aspect ratio maintained by the container height)
- CalendarPlanner takes `flex-1` remaining width
- CalendarPlanner still has its own internal split (calendar left + day detail right 400px) — this creates the 3-panel layout
- Add `gap-4` between map and planner
- The map should have `aspect-square` or just fill its container height naturally — it's a Mapbox GL canvas so it'll fill whatever container it's given

### Responsive consideration
- On narrower screens where 350px map + calendar + 400px detail won't fit, hide the map. Use a breakpoint check: only show the left map panel when viewport is ≥ 1280px (`min-width: 1280px`). Below that, keep the current horizontal strip layout as fallback.

## Part 2: Smart Date Picker

### Modified file: `components/stitch/planner/PlannerTripDates.tsx`

Replace the editing state with smarter date inputs:

**Smart constraints:**
- End date `<input type="date">` should have `min={tripStart}` so the user can't pick an end date before the start date
- Start date input: when changed, if the new start is after the current end, auto-clear the end date
- Show human-readable date summary when not editing: "Feb 22 – Mar 1, 2026" instead of raw ISO "2026-02-22 → 2026-03-01"
- Show trip duration: "(8 days)" next to the date range

**Timezone improvement:**
- Replace the raw text input for timezone with a `<select>` of common travel timezones, grouped by region
- Include: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Anchorage, America/Honolulu, Europe/London, Europe/Paris, Europe/Berlin, Europe/Rome, Europe/Madrid, Europe/Istanbul, Asia/Tokyo, Asia/Seoul, Asia/Shanghai, Asia/Hong_Kong, Asia/Singapore, Asia/Bangkok, Asia/Dubai, Asia/Kolkata, Australia/Sydney, Australia/Melbourne, Pacific/Auckland
- Still allow a free-text fallback for unlisted timezones (combo input: select with a "Other..." option that reveals a text field)
- Group the `<select>` options with `<optgroup>` by region (Americas, Europe, Asia, Australia/Pacific)

**Cleaner display when not editing:**
```
Trip Dates                          [Edit dates]
Feb 22 – Mar 1, 2026 (8 days) · Eastern Time
```

Instead of the current:
```
Trip Dates                          [Edit dates]
2026-02-22 → 2026-03-01 · America/New_York
```

### New helper: `lib/lists/date-display.ts`

```typescript
/** Format ISO date range for display: "Feb 22 – Mar 1, 2026" */
export function formatDateRange(start: string, end: string): string

/** Human-friendly timezone label: "America/New_York" → "Eastern Time" */
export function friendlyTimezoneName(iana: string): string

/** Count days between two ISO dates, inclusive */
export function daysBetweenInclusive(start: string, end: string): number
```

## Files summary

| File | Action |
|------|--------|
| `components/app/PlannerShellPaper.tsx` | **Modify** — 3-column layout with map on left |
| `components/stitch/planner/PlannerTripDates.tsx` | **Modify** — smart date constraints, human-readable display, timezone select |
| `lib/lists/date-display.ts` | **New** — date formatting and timezone helpers |

## Styling

- Map panel: `rounded-[4px] border border-paper-tertiary-fixed`, fills height naturally
- Date display: `font-headline text-xs font-extrabold` for the formatted range
- Duration badge: `text-paper-on-surface-variant` muted
- Timezone select: same styling as date inputs, `md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container`

## Verification

1. Navigate to `localhost:3000?mode=plan` on desktop (≥1280px wide)
2. Map appears as a square-ish panel on the left side
3. Calendar grid + day detail fill the remaining space to the right
4. Map pins are interactive — clicking a pin selects the day and item
5. Map colors pins by selected day
6. Narrow the window below 1280px — map should fall back to horizontal strip or hide
7. Click "Edit dates" — end date picker has min constraint matching start date
8. Change start date to after end date — end date auto-clears
9. Date display shows "Feb 22 – Mar 1, 2026 (8 days)" format
10. Timezone shows as dropdown with grouped options
11. No TypeScript errors: `npx tsc --noEmit`
