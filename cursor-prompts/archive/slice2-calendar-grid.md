# Slice 2 — Calendar Grid (Week View)

## Goal

Replace the current `ListPlanner` day grid in `PlannerShellPaper` with a new clean-sheet `CalendarPlanner` component. This slice builds **week view only** — a 7-column calendar grid with day-of-week headers, where each day cell shows scheduled items. The existing `ListPlanner` stays untouched as a fallback on mobile.

## Context

Read these files first to understand the data layer and current architecture:
- `CONTEXT.md` — architecture overview, component tree, state stores
- `DESIGN.md` — design system tokens, visual language
- `docs/PLAN_PAGE_SLICES.md` — full rebuild plan (you're doing Slice 2)
- `lib/state/useTripStore.ts` — shared state: `activeListId`, `activeListItems`, `plannerSelectedDay`
- `lib/lists/planner.ts` — `PlannerSlot` type, slot constants, category ordering, date helpers
- `components/stitch/ListDetailBody.tsx` — `ListItemRow` and `ListSummary` types (lines 16–47)
- `components/stitch/ListPlanner.tsx` — current planner (reference for data fetching pattern, ~lines 71–170)
- `components/app/PlannerShellPaper.tsx` — where CalendarPlanner will be mounted

## What to build

### New files

**`components/planner/CalendarPlanner.tsx`** — top-level wrapper
- Props: `{ listId: string; onPlanMutated?: () => void }`
- Fetches list data + items from `GET /api/lists/{listId}/items` (same pattern as ListPlanner lines ~100–170)
- Computes `tripDates` array from `list.start_date` / `list.end_date` using `enumerateIsoDatesInclusive` from `lib/lists/planner.ts`
- Groups items by `scheduled_date` into a `Map<string, ListItemRow[]>`
- Manages `selectedDay` state synced to `useTripStore.plannerSelectedDay`
- Renders: `PlannerTripDates` (existing, for date editing) + `CalendarWeekGrid` + `PlannerBacklog` (existing) + `PlannerDoneBlock` (existing, if it exists — check first)

**`components/planner/CalendarWeekGrid.tsx`** — the 7-column calendar
- Renders a header row with day-of-week labels: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Below: a grid of `DayCell` components, one per trip date
- Trip dates fill left-to-right by their actual day of week (so if the trip starts on Wednesday, Mon/Tue of week 1 are empty)
- If trip spans multiple weeks, render multiple week rows
- Selected day cell gets a highlight ring/border

**`components/planner/DayCell.tsx`** — individual day in the grid
- Props: `{ date: string; items: ListItemRow[]; isSelected: boolean; isToday: boolean; onClick: () => void }`
- Shows: date number (e.g. "15"), day-of-month
- Shows: item count badge
- Shows: first ~3 item names as truncated preview text
- Density indicator: visual treatment that differs for empty (muted), light (1-2 items), packed (3+ items)
- Click selects the day
- Minimum cell height: ~100px so there's room for content
- Use paper design tokens: `bg-paper-surface`, `border-paper-tertiary-fixed`, `text-paper-on-surface`, etc.

### Modified files

**`components/app/PlannerShellPaper.tsx`**
- Replace `<ListPlanner>` with `<CalendarPlanner>` in the desktop layout
- Keep the `ListPlanner` import removed — CalendarPlanner handles its own data fetching
- Keep MapInset and PlannerListSwitcher as-is

### NOT modified (keep as-is for now)
- `components/app/PlannerShell.tsx` — mobile still uses ListPlanner (Slice 2 is desktop only)
- `components/stitch/ListPlanner.tsx` — untouched, still used on mobile
- No drag-and-drop yet (that's Slice 4)
- No day detail panel yet (that's Slice 3)

## Data flow

```
CalendarPlanner
  ├── fetches from GET /api/lists/{listId}/items → { list: ListSummary, items: ListItemRow[] }
  ├── computes tripDates = enumerateIsoDatesInclusive(list.start_date, list.end_date)
  ├── groups: scheduledItemsByDate = Map<string, ListItemRow[]>
  ├── backlogItems = items where scheduled_date is null AND completed_at is null
  ├── doneItems = items where completed_at is not null
  ├── selectedDay = useTripStore.plannerSelectedDay
  │
  ├── <PlannerTripDates> (existing component, pass same props as ListPlanner does)
  ├── <CalendarWeekGrid tripDates={tripDates} itemsByDate={scheduledItemsByDate} selectedDay={selectedDay} onSelectDay={...} />
  ├── <PlannerBacklog> (existing component)
  └── Done section (items with completed_at)
```

## Visual spec

```
┌──────────────────────────────────────────────┐
│  Trip Dates: Feb 22 → Mar 1                  │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │      │  22  │  23  │  24  │  25  │  26  │
│      │      │ 3 ▪  │ 1 ▪  │      │ 2 ▪  │      │
│      │      │Ramen │Coffee│      │Temple│      │
│      │      │Sushi │      │      │Shop  │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  27  │  28  │   1  │      │      │      │      │
│ 4 ▪  │ 1 ▪  │      │      │      │      │      │
│Market│Flight│      │      │      │      │      │
│Lunch │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
│                                                │
│  Backlog (unscheduled items)                   │
│  ┌─ Onsen visit                                │
│  └─ Souvenir shopping                          │
└────────────────────────────────────────────────┘
```

## Styling rules

- Use paper design tokens throughout (this is the desktop Paper shell)
- `font-headline` for headers, `font-body` for content
- `rounded-[4px]` for borders (Paper convention)
- Selected day: `ring-2 ring-paper-primary`
- Today: subtle `bg-paper-primary/10` tint
- Empty cells: `bg-paper-surface-container-low` with muted text
- Packed cells (3+): slightly stronger border or left accent
- Grid gap: `gap-px` or `gap-0.5` for tight calendar feel with visible borders

## Key imports

```typescript
import { enumerateIsoDatesInclusive } from '@/lib/lists/planner'
import { useTripStore } from '@/lib/state/useTripStore'
import type { ListItemRow, ListSummary } from '@/components/stitch/ListDetailBody'
import PlannerTripDates from '@/components/stitch/planner/PlannerTripDates'
import PlannerBacklog from '@/components/stitch/planner/PlannerBacklog'
```

## Verification

1. Navigate to `localhost:3000?mode=plan` on desktop (≥768px)
2. Select a list that has trip dates set and some scheduled items
3. Should see a 7-column week grid with day-of-week headers
4. Trip dates should be correctly positioned by day of week
5. Day cells show item count and preview names
6. Clicking a day cell updates `plannerSelectedDay` in the store
7. Selected day has a visual highlight
8. Backlog section still shows unscheduled items below the grid
9. Mobile (resize to <768px) should still show the old ListPlanner
10. No TypeScript errors: `npx tsc --noEmit`
