import { type DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import PlannerDayCell from './PlannerDayCell'

type Props = {
  tripDates: string[]
  scheduledItemsByDate: Map<string, ListItemRow[]>
  selectedDay: string | null
  todayIso: string
  canDrag: boolean
  dropTargetKey: string | null
  tone: 'light' | 'dark'
  onSelectDay: (date: string) => void
  onDragOverDay: (event: DragEvent, date: string) => void
  onDropDay: (event: DragEvent, date: string) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
}

export default function PlannerDayGrid({
  tripDates,
  scheduledItemsByDate,
  selectedDay,
  todayIso,
  canDrag,
  dropTargetKey,
  tone,
  onSelectDay,
  onDragOverDay,
  onDropDay,
  onDragStartItem,
  onDragEndItem,
}: Props) {
  const isDark = tone === 'dark'
  const emptyClass = isDark ? 'text-slate-400' : 'text-slate-500'

  if (!tripDates.length) {
    return (
      <p className={`text-[11px] ${emptyClass}`}>
        No trip dates set. Set dates above to see the day grid.
      </p>
    )
  }

  return (
    <div
      data-testid="planner-day-grid"
      className="grid grid-cols-4 gap-1.5 md:grid-cols-7"
    >
      {tripDates.map((date) => (
        <PlannerDayCell
          key={date}
          date={date}
          items={scheduledItemsByDate.get(date) ?? []}
          isSelected={selectedDay === date}
          isToday={date === todayIso}
          isDragOver={dropTargetKey === `day:${date}`}
          canDrag={canDrag}
          tone={tone}
          onSelect={onSelectDay}
          onDragOverDay={onDragOverDay}
          onDropDay={onDropDay}
          onDragStartItem={onDragStartItem}
          onDragEndItem={onDragEndItem}
        />
      ))}
    </div>
  )
}
