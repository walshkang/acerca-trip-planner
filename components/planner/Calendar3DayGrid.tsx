'use client'

import type { DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { addUtcDays } from '@/lib/lists/calendar-week'
import { shiftThreeDayWindow } from '@/lib/lists/calendar-view-window'
import { formatUtcShortDayDate } from '@/lib/lists/calendar-display'
import DayCell from '@/components/planner/DayCell'

type Props = {
  tripStart: string
  tripEnd: string
  windowStart: string
  visibleDayCount: number
  tripDayCount: number
  canShift: boolean
  onShiftWindow: (direction: 'prev' | 'next') => void
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

export default function Calendar3DayGrid({
  tripStart,
  tripEnd,
  windowStart,
  visibleDayCount,
  tripDayCount,
  canShift,
  onShiftWindow,
  itemsByDate,
  selectedDay,
  todayIso,
  onSelectDay,
  resolveCategoryEmoji,
  canDrag,
  dropTargetKey,
  onDragOverDay,
  onDropDay,
  onDragStartItem,
  onDragEndItem,
  dragItemId,
}: Props) {
  const dates: string[] = []
  for (let i = 0; i < visibleDayCount; i++) {
    dates.push(addUtcDays(windowStart, i))
  }

  const prevDisabled =
    !canShift ||
    shiftThreeDayWindow(tripStart, tripEnd, windowStart, 'prev', tripDayCount) === windowStart
  const nextDisabled =
    !canShift ||
    shiftThreeDayWindow(tripStart, tripEnd, windowStart, 'next', tripDayCount) === windowStart

  const gridCols =
    visibleDayCount === 1 ? 'grid-cols-1' : visibleDayCount === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <section aria-label="Three-day calendar" className="space-y-2">
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        <button
          type="button"
          aria-label="Previous days"
          disabled={prevDisabled}
          onClick={() => onShiftWindow('prev')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-paper-tertiary-fixed text-paper-on-surface-variant hover:bg-paper-surface-container disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_left</span>
        </button>
        <div className={`grid min-w-0 flex-1 ${gridCols} gap-1 px-1`}>
          {dates.map((d) => (
            <div
              key={d}
              className="bg-paper-surface-container-low py-1.5 text-center font-headline text-[10px] font-extrabold uppercase tracking-tighter text-paper-on-surface-variant"
            >
              {formatUtcShortDayDate(d)}
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next days"
          disabled={nextDisabled}
          onClick={() => onShiftWindow('next')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-paper-tertiary-fixed text-paper-on-surface-variant hover:bg-paper-surface-container disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_right</span>
        </button>
      </div>
      <div
        data-testid="planner-day-grid"
        className={`grid ${gridCols} gap-px rounded-[4px] border border-paper-tertiary-fixed bg-paper-tertiary-fixed overflow-hidden`}
        role="grid"
      >
        {dates.map((cellDate) => {
          const items = itemsByDate.get(cellDate) ?? []
          const dayKey = `day:${cellDate}`
          return (
            <div key={cellDate} className="bg-paper-surface p-px" role="gridcell">
              <DayCell
                date={cellDate}
                items={items}
                isSelected={selectedDay === cellDate}
                isToday={todayIso === cellDate}
                isDragOver={dropTargetKey === dayKey}
                canDrag={canDrag}
                resolveCategoryEmoji={resolveCategoryEmoji}
                minHeightClassName="min-h-[200px]"
                onClick={() => onSelectDay(cellDate)}
                onDragOverDay={onDragOverDay}
                onDropDay={onDropDay}
                onDragStartItem={onDragStartItem}
                onDragEndItem={onDragEndItem}
                dragItemId={dragItemId}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
