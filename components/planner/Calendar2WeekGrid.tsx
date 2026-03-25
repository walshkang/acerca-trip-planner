'use client'

import type { DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { addUtcDays } from '@/lib/lists/calendar-week'
import { shiftTwoWeekMonday } from '@/lib/lists/calendar-view-window'
import DayCell from '@/components/planner/DayCell'

const HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Props = {
  tripStart: string
  tripEnd: string
  windowStartMonday: string
  allowedMondays: string[]
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
  onShiftWindow: (direction: 'prev' | 'next') => void
}

export default function Calendar2WeekGrid({
  tripStart,
  tripEnd,
  windowStartMonday,
  allowedMondays,
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
  onShiftWindow,
}: Props) {
  const cells: string[] = []
  for (let i = 0; i < 14; i++) {
    cells.push(addUtcDays(windowStartMonday, i))
  }

  const showNav = allowedMondays.length > 1
  const prevDisabled =
    !showNav ||
    shiftTwoWeekMonday(windowStartMonday, 'prev', allowedMondays) === windowStartMonday
  const nextDisabled =
    !showNav ||
    shiftTwoWeekMonday(windowStartMonday, 'next', allowedMondays) === windowStartMonday

  const grid = (
    <div
      data-testid="planner-day-grid"
      className="grid grid-cols-7 gap-px rounded-[4px] border border-paper-tertiary-fixed bg-paper-tertiary-fixed overflow-hidden"
      role="grid"
    >
      {HEADER.map((label) => (
        <div
          key={label}
          className="bg-paper-surface-container-low px-2 py-1.5 text-center font-headline text-[10px] font-extrabold uppercase tracking-tighter text-paper-on-surface-variant"
          role="columnheader"
        >
          {label}
        </div>
      ))}
      {cells.map((cellDate) => {
        const inTrip = cellDate >= tripStart && cellDate <= tripEnd
        if (!inTrip) {
          return (
            <div
              key={cellDate}
              className="min-h-[120px] bg-paper-surface-container-low"
              aria-hidden
            />
          )
        }
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
              minHeightClassName="min-h-[120px]"
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
  )

  if (!showNav) {
    return (
      <section aria-label="Two-week calendar" className="space-y-2">
        {grid}
      </section>
    )
  }

  return (
    <section aria-label="Two-week calendar" className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="Previous two weeks"
          disabled={prevDisabled}
          onClick={() => onShiftWindow('prev')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-paper-tertiary-fixed text-paper-on-surface-variant hover:bg-paper-surface-container disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_left</span>
        </button>
        <button
          type="button"
          aria-label="Next two weeks"
          disabled={nextDisabled}
          onClick={() => onShiftWindow('next')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-paper-tertiary-fixed text-paper-on-surface-variant hover:bg-paper-surface-container disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_right</span>
        </button>
      </div>
      {grid}
    </section>
  )
}
