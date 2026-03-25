# Slice 3 — Day Detail Panel + Drag-and-Drop

## Goal

Add two features to the CalendarPlanner:
1. **Day detail panel** — when a day is selected, show its items in a persistent right panel split into Morning / Afternoon / Evening sections with category icons and item cards.
2. **Drag-and-drop** — drag items between day cells in the calendar grid, between backlog and days, and reorder within the day detail panel.

## Context

Read these files first:
- `components/planner/CalendarPlanner.tsx` — the main planner (has `scheduleItem`, `nextOrderForDayMove`, `selectedDay`, `scheduledItemsByDate` already)
- `components/planner/CalendarWeekGrid.tsx` — the 7-column calendar grid
- `components/planner/DayCell.tsx` — individual day cells
- `components/stitch/planner/PlannerDayDetail.tsx` — **reference only** — the old day detail component from ListPlanner. Study its props and rendering for patterns, but do NOT reuse it. Build a new one.
- `components/stitch/ListPlanner.tsx` — **reference only** — study the drag-and-drop wiring (lines 364–500) for patterns: `onDragStart`, `onDragEnd`, `onDragOverTarget`, `onDropDay`, `onDropReorder`, `onDropBacklog`, `onDropDone`. Replicate this pattern in CalendarPlanner.
- `lib/lists/planner.ts` — `PlannerSlot`, `PLANNER_SLOT_ORDER`, `slotFromScheduledStartTime`, `scheduledStartTimeFromSlot`, `PLANNER_CATEGORY_ORDER`
- `lib/icons/useCategoryIconOverrides.ts` — `resolveCategoryEmoji` hook for item icons
- `DESIGN.md` — design tokens and visual system

## Part 1: Day Detail Panel

### New file: `components/planner/CalendarDayDetail.tsx`

**Layout:** Persistent right panel (400px wide) in a split layout with the calendar grid.

**Structure:**
```
CalendarDayDetail
├── Header: day label + item count
├── Morning section (items with scheduled_start_time sentinel 09:00)
│   ├── Section label "Morning"
│   └── Item cards (food first, then activities/shopping)
├── Afternoon section (sentinel 14:00)
│   ├── Section label "Afternoon"
│   └── Item cards (same sort)
├── Evening section (sentinel 19:00)
│   ├── Section label "Evening"
│   └── Item cards (same sort)
└── Unslotted section (items with no scheduled_start_time on this day)
    ├── Section label "Unscheduled"
    └── Item cards
```

**Item cards show:**
- Category emoji via `resolveCategoryEmoji(place.category)` from `useCategoryIconOverrides(listId)`
- Place name (truncated)
- Place address (muted, truncated)
- "Move" button (triggers the existing `setMoveItemId` flow)
- Draggable (for reordering within the day)

**Sorting within each slot section:**
- Use `PLANNER_CATEGORY_ORDER` from `lib/lists/planner.ts`: Food, Coffee first, then Sights, Activity, Shop, Drinks
- Within same category, sort by `scheduled_order`

**Slot assignment logic:**
- Use `slotFromScheduledStartTime(item.scheduled_start_time)` to determine which section an item belongs to
- Items with `null` scheduled_start_time go in "Unscheduled" at the bottom
- When a user drops an item into a slot section, set its `scheduled_start_time` via the sentinel times in `PLANNER_SLOT_SENTINEL_TIME`

### Modified file: `components/planner/CalendarPlanner.tsx`

Change the layout from full-width to a split layout:
```tsx
<div className="flex h-full">
  {/* Left: calendar grid + backlog + done */}
  <div className="flex-1 overflow-y-auto p-3">
    {tripDatesBlock}
    {calendarGrid}
    {backlogBlock}
    {doneBlock}
  </div>
  {/* Right: day detail panel */}
  <div className="w-[400px] shrink-0 overflow-y-auto border-l border-paper-tertiary-fixed bg-paper-surface-warm p-3">
    {selectedDay ? (
      <CalendarDayDetail
        date={selectedDay}
        items={selectedDayItems}
        listId={listId}
        resolveCategoryEmoji={resolveCategoryEmoji}
        onPlaceSelect={onPlaceSelect}
        onMoveItem={setMoveItemId}
        {/* ...drag props, see Part 2 */}
      />
    ) : (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-paper-on-surface-variant">Select a day to see details</p>
      </div>
    )}
  </div>
</div>
```

Add `useCategoryIconOverrides(listId)` to CalendarPlanner — it's already used in ListPlanner and provides `resolveCategoryEmoji`.

## Part 2: Drag-and-Drop

### Pattern to follow

Study `ListPlanner.tsx` lines 364–500 for the exact drag pattern. Replicate it in `CalendarPlanner.tsx`:

**State to add:**
```typescript
const [canDrag, setCanDrag] = useState(false)          // only on desktop with fine pointer
const [dragItemId, setDragItemId] = useState<string | null>(null)
const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
```

**Enable drag on desktop only** (same as ListPlanner line 365–372):
```typescript
useEffect(() => {
  const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
  const apply = () => setCanDrag(media.matches)
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}, [])
```

**Callbacks to add/wire:**
- `onDragStart(itemId)` — set dragItemId, store item ID in dataTransfer
- `onDragEnd()` — clear dragItemId and dropTargetKey
- `onDragOverTarget(e, key)` — preventDefault, set dropTargetKey
- `onDropDay(e, date)` — schedule item to the target date (morning slot by default), call `scheduleItem` which already exists
- `onDropBacklog(e)` — schedule item to backlog
- `onDropDone(e)` — mark item as done
- `onDropReorder(e, date, beforeItemId)` — reorder within a day using `nextOrderForDayMove`

### Modified file: `components/planner/DayCell.tsx`

Add drag-and-drop target support:
- New props: `canDrag`, `isDragOver`, `onDragOver`, `onDrop`, `onDragStartItem`, `onDragEndItem`
- Each item preview in the cell should be `draggable={canDrag}` with `onDragStart`
- The cell itself is a drop target: `onDragOver`, `onDrop`
- Visual feedback: when `isDragOver`, show a highlight border (e.g. `ring-2 ring-paper-primary`)

### Modified file: `components/planner/CalendarWeekGrid.tsx`

Pass drag props through to DayCell:
- New props: `canDrag`, `dropTargetKey`, `onDragOverDay`, `onDropDay`, `onDragStartItem`, `onDragEndItem`
- Thread these to each `DayCell`

### Modified file: `components/planner/CalendarDayDetail.tsx`

Each slot section is a drop target (for changing an item's time slot).
Each item card is draggable (for reordering or moving to another day/slot).
- Props include: `canDrag`, `dropTargetKey`, `onDragOverItem`, `onDropReorder`, `onDragStartItem`, `onDragEndItem`, `savingItemId`
- Dropping an item into a different slot section changes its `scheduled_start_time`

### Modified file: `components/stitch/planner/PlannerBacklog.tsx`

Already supports drag — just make sure CalendarPlanner passes the same drag props that ListPlanner does. Check the existing PlannerBacklog props and wire them.

## Styling

- Use paper design tokens throughout (desktop Paper shell)
- Day detail panel: `bg-paper-surface-warm`, `border-paper-tertiary-fixed`
- Slot section headers: `font-headline text-xs font-extrabold uppercase tracking-tight text-paper-on-surface`
- Item cards: `rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container-low`
- Drop target highlight: `ring-2 ring-paper-primary bg-paper-surface-container`
- Drag ghost: browser default is fine for now

## Key imports

```typescript
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import {
  type PlannerSlot,
  PLANNER_SLOT_ORDER,
  PLANNER_CATEGORY_ORDER,
  slotFromScheduledStartTime,
  scheduledStartTimeFromSlot,
} from '@/lib/lists/planner'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
```

## Files summary

| File | Action |
|------|--------|
| `components/planner/CalendarDayDetail.tsx` | **New** — day detail panel with Morning/Afternoon/Evening sections |
| `components/planner/CalendarPlanner.tsx` | **Modify** — split layout, add drag state + callbacks, wire detail panel |
| `components/planner/CalendarWeekGrid.tsx` | **Modify** — pass drag props to DayCell |
| `components/planner/DayCell.tsx` | **Modify** — add drag source + drop target |

## Verification

1. Navigate to `localhost:3000?mode=plan` on desktop
2. Select a list with trip dates and scheduled items
3. Calendar grid shows on the left, day detail panel on the right (400px)
4. Click a day → detail panel shows items grouped by Morning/Afternoon/Evening
5. Items within each slot are sorted: food/coffee first, then activities
6. Drag an item from one day cell to another → item moves to the new date
7. Drag an item from backlog to a day cell → item gets scheduled
8. Drag an item within the day detail panel → reorders (scheduled_order updates)
9. "Move" button on item cards still works (opens PlannerMovePicker)
10. Drop target highlights appear when dragging over valid targets
11. No TypeScript errors: `npx tsc --noEmit`
