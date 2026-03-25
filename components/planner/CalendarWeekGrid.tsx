'use client'

import type { DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { buildCalendarWeekRows } from '@/lib/lists/calendar-week'
import DayCell from '@/components/planner/DayCell'

const HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Props = {
  tripStart: string
  tripEnd: string
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

export default function CalendarWeekGrid({
  tripStart,
  tripEnd,
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
  const rows = buildCalendarWeekRows(tripStart, tripEnd)
  if (!rows?.length) return null

  return (
    <section aria-label="Trip calendar" className="space-y-2">
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
        {rows.flatMap((row) =>
          row.cells.map((cellDate) => {
            const inTrip = cellDate >= tripStart && cellDate <= tripEnd
            if (!inTrip) {
              return (
                <div
                  key={cellDate}
                  className="min-h-[148px] bg-paper-surface-container-low"
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
                  onClick={() => onSelectDay(cellDate)}
                  onDragOverDay={onDragOverDay}
                  onDropDay={onDropDay}
                  onDragStartItem={onDragStartItem}
                  onDragEndItem={onDragEndItem}
                  dragItemId={dragItemId}
                />
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
