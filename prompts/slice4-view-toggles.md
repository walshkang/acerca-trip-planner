# Slice 4 — View Toggles (3-day, week, 2-week, agenda)

## Goal

Add a view mode switcher to the CalendarPlanner toolbar. Four modes: **3-day**, **week** (default, already built), **2-week**, and **agenda** (continuous vertical scroll). All modes are interactive — items are draggable between days in every view.

## Context

Read these files first:
- `components/planner/CalendarPlanner.tsx` — main planner, manages state and drag logic
- `components/planner/CalendarWeekGrid.tsx` — current 7-column grid (week view), receives drag props
- `components/planner/DayCell.tsx` — day cell with drag source/target, used by CalendarWeekGrid
- `lib/lists/calendar-week.ts` — `buildCalendarWeekRows`, `addUtcDays`, `utcWeekdayMon0`, `utcMondayOfWeek`
- `components/planner/CalendarDayDetail.tsx` — right panel (stays as-is, works with any view)
- `DESIGN.md` — design tokens

## What to build

### New type

Add to `CalendarPlanner.tsx` or a shared types file:
```typescript
type CalendarView = '3day' | 'week' | '2week' | 'agenda'
```

### New file: `components/planner/CalendarViewToggle.tsx`

A compact button group in the planner toolbar area. Shows four options:

```
[ 3 Day ] [ Week ] [ 2 Week ] [ Agenda ]
```

**Props:**
```typescript
{
  view: CalendarView
  onViewChange: (view: CalendarView) => void
}
```

**Styling:**
- Horizontal button group with `rounded-[4px]` outer border
- Active button: `bg-paper-primary text-paper-on-primary`
- Inactive: `text-paper-on-surface-variant hover:bg-paper-surface-container`
- `font-headline text-[10px] font-extrabold uppercase tracking-tight`

### New file: `components/planner/Calendar3DayGrid.tsx`

A 3-column grid showing 3 consecutive days. Horizontally scrollable window that can shift forward/back.

**Props:** Same as `CalendarWeekGrid` plus:
```typescript
{
  /** The first visible date of the 3-day window */
  windowStart: string
  onShiftWindow: (direction: 'prev' | 'next') => void
}
```

**Layout:**
```
  [ < ]  Wed 26    Thu 27    Fri 28  [ > ]
  ┌─────────┬─────────┬─────────┐
  │  (cell) │  (cell) │  (cell) │
  └─────────┴─────────┴─────────┘
```

- 3 columns, each renders a `DayCell` (reuse existing component)
- Header row shows day-of-week + date number (e.g. "Wed 26")
- Left/right arrow buttons to shift the 3-day window by 1 day
- Window is clamped to trip date range (can't go before start or after end)
- Cells should be taller than week view since there are only 3 columns — use `min-h-[200px]`
- All drag props pass through to DayCell (same as CalendarWeekGrid)

### New file: `components/planner/Calendar2WeekGrid.tsx`

A 14-day grid: 7 columns x 2 rows. Same structure as `CalendarWeekGrid` but always shows exactly 2 calendar weeks.

**Props:** Same as `CalendarWeekGrid` plus:
```typescript
{
  /** The first visible Monday */
  windowStart: string
  onShiftWindow: (direction: 'prev' | 'next') => void
}
```

**Layout:**
- Identical to CalendarWeekGrid (7 columns, Mon-Sun header)
- Always renders exactly 2 week rows
- If the trip spans more than 2 weeks, add prev/next navigation arrows
- If the trip fits in 2 weeks, no arrows needed
- Cells are slightly smaller than week view to fit 2 rows: `min-h-[120px]`
- Reuse `DayCell` with all drag props

### New file: `components/planner/CalendarAgendaView.tsx`

A continuous vertical scroll of all trip days. Each day is a full-width section.

**Props:**
```typescript
{
  tripDates: string[]
  itemsByDate: Map<string, ListItemRow[]>
  selectedDay: string | null
  todayIso: string
  onSelectDay: (day: string) => void
  resolveCategoryEmoji: (category: string) => string
  canDrag: boolean
  dropTargetKey: string | null
  onDragOverDay: (event: DragEvent, date: string) => void
  onDropDay: (event: DragEvent, date: string) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
  dragItemId: string | null
}
```

**Layout:**
```
┌──────────────────────────────────┐
│ Wed, Feb 26                    3 │
│ ┌──────────────────────────────┐ │
│ │ 🍜 Ramen Alley              │ │
│ │ 🏯 Temple Visit             │ │
│ │ 🛒 Souvenir Shopping        │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Thu, Feb 27                    1 │
│ ┌──────────────────────────────┐ │
│ │ ☕ Coffee Shop               │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Fri, Feb 28                    0 │
│   No places scheduled            │
└──────────────────────────────────┘
```

- Each day section: date header (day-of-week + full date + item count) + list of item cards
- Item cards: category emoji + place name, draggable
- Each day section is a drop target (drag items between days)
- Selected day has highlight background
- Today gets subtle tint
- Empty days show "No places scheduled" muted text
- Clicking a day header selects it (updates detail panel on right)

### Modified file: `components/planner/CalendarPlanner.tsx`

**Add state:**
```typescript
const [view, setView] = useState<CalendarView>('week')
const [windowStart, setWindowStart] = useState<string | null>(null)
```

**Add `CalendarViewToggle`** in the toolbar area, above the grid:
```tsx
<div className="flex items-center justify-between">
  {tripDatesBlock}
  <CalendarViewToggle view={view} onViewChange={setView} />
</div>
```

**Render the active view:**
```tsx
{view === '3day' && <Calendar3DayGrid ... />}
{view === 'week' && <CalendarWeekGrid ... />}  {/* already exists */}
{view === '2week' && <Calendar2WeekGrid ... />}
{view === 'agenda' && <CalendarAgendaView ... />}
```

**Window management:**
- `windowStart` initializes when view changes:
  - 3-day: clamp `selectedDay ?? tripDates[0]` so 3 days fit within trip
  - 2-week: `utcMondayOfWeek(selectedDay ?? tripDates[0])`
- `onShiftWindow('prev'|'next')`:
  - 3-day: shift by 1 day, clamped to trip range
  - 2-week: shift by 1 week (7 days), clamped

**All views receive the same drag props** that CalendarWeekGrid already gets. No new drag logic needed — the existing `onDragOverDay`, `onDropDay`, `onDragStartItem`, `onDragEndItem` work for any view.

### Modified file: `components/planner/DayCell.tsx`

No changes needed — already used by all grid views.

## Files summary

| File | Action |
|------|--------|
| `components/planner/CalendarViewToggle.tsx` | **New** — view mode button group |
| `components/planner/Calendar3DayGrid.tsx` | **New** — 3-column sliding window |
| `components/planner/Calendar2WeekGrid.tsx` | **New** — 14-day grid with optional nav |
| `components/planner/CalendarAgendaView.tsx` | **New** — continuous vertical scroll |
| `components/planner/CalendarPlanner.tsx` | **Modify** — add view state, toggle, render switch |

## Styling

- All views use paper design tokens
- View toggle: tight button group, same height as trip dates section
- 3-day arrows: `material-symbols-outlined` icons `chevron_left` / `chevron_right`
- Agenda day headers: `font-headline text-sm font-extrabold uppercase tracking-tight`
- Agenda item cards: same style as DayCell item previews but full-width

## Verification

1. Navigate to `localhost:3000?mode=plan` on desktop
2. View toggle shows above the calendar grid: 3 Day | Week | 2 Week | Agenda
3. **Week** (default): same as before, 7-column grid
4. **3 Day**: 3 columns, arrow buttons shift the window, clamped to trip range
5. **2 Week**: 14-day grid (7x2), arrows if trip > 2 weeks
6. **Agenda**: continuous scroll, all days listed vertically
7. Drag-and-drop works in ALL views (items between days, backlog↔day)
8. Selecting a day in any view updates the detail panel on the right
9. Switching views preserves the selected day
10. No TypeScript errors: `npx tsc --noEmit`
