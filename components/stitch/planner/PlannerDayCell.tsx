import { type DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'
import {
  DAY_CAPACITY_WARN,
  formatDayLabel,
  slotDotClassName,
  slotLabel,
} from './planner-utils'

type Props = {
  date: string
  items: ListItemRow[]
  isSelected: boolean
  isToday: boolean
  isDragOver: boolean
  canDrag: boolean
  tone: 'light' | 'dark'
  onSelect: (date: string) => void
  onDragOverDay: (event: DragEvent, date: string) => void
  onDropDay: (event: DragEvent, date: string) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
}

const MAX_VISIBLE_ITEMS = 5

export default function PlannerDayCell({
  date,
  items,
  isSelected,
  isToday,
  isDragOver,
  canDrag,
  tone,
  onSelect,
  onDragOverDay,
  onDropDay,
  onDragStartItem,
  onDragEndItem,
}: Props) {
  const isDark = tone === 'dark'
  const overflow = items.length > MAX_VISIBLE_ITEMS
  const visibleItems = overflow ? items.slice(0, MAX_VISIBLE_ITEMS) : items
  const overflowCount = items.length - MAX_VISIBLE_ITEMS
  const isOverCapacity = items.length > DAY_CAPACITY_WARN

  const baseBorder = isDark ? 'border-white/10' : 'border-slate-200'
  const selectedBorder = isDark
    ? 'ring-2 ring-sky-400/60 border-sky-400/40'
    : 'ring-2 ring-sky-500/50 border-sky-500/30'
  const todayBorder = isDark
    ? 'border-sky-400/30'
    : 'border-sky-500/25'
  const dropBorder = isDark
    ? 'bg-slate-100/10 ring-1 ring-slate-200/40'
    : 'bg-sky-50 ring-1 ring-sky-300/50'
  const capacityBg = isDark ? 'bg-amber-900/20' : 'bg-amber-50'
  const bg = isDark ? 'bg-white/5' : 'bg-white/80'
  const emptyBg = isDark
    ? 'border-dashed border-white/5'
    : 'border-dashed border-slate-200'
  const labelClass = isDark ? 'text-slate-200' : 'text-slate-700'
  const countClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const nameClass = isDark ? 'text-slate-100' : 'text-slate-800'
  const overflowClass = isDark ? 'text-slate-400' : 'text-slate-500'

  const isEmpty = items.length === 0

  return (
    <div
      data-testid="planner-day-cell"
      data-day={date}
      className={`rounded-lg border p-1.5 min-h-[70px] cursor-pointer transition-all ${
        isEmpty ? emptyBg : `${bg} ${baseBorder}`
      } ${isSelected ? selectedBorder : ''} ${
        !isSelected && isToday ? todayBorder : ''
      } ${isDragOver ? dropBorder : ''} ${
        isOverCapacity && !isDragOver ? capacityBg : ''
      }`}
      onClick={() => onSelect(date)}
      onDragOver={(e) => onDragOverDay(e, date)}
      onDrop={(e) => onDropDay(e, date)}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={`text-[10px] font-semibold ${labelClass}`}>
          {formatDayLabel(date)}
        </span>
        {items.length > 0 ? (
          <span className={`text-[10px] ${countClass}`}>{items.length}</span>
        ) : null}
      </div>

      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const slot = slotFromScheduledStartTime(item.scheduled_start_time)
          return (
            <div
              key={item.id}
              draggable={canDrag}
              onDragStart={(e) => {
                e.stopPropagation()
                onDragStartItem(item.id)
              }}
              onDragEnd={onDragEndItem}
              className="flex items-center gap-1 min-w-0"
            >
              <span
                title={slotLabel(slot)}
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${slotDotClassName(slot, tone)}`}
              />
              <span className={`truncate text-[10px] leading-tight ${nameClass}`}>
                {item.place?.name ?? 'Unknown'}
              </span>
            </div>
          )
        })}
        {overflow ? (
          <span className={`text-[10px] ${overflowClass}`}>
            +{overflowCount} more
          </span>
        ) : null}
      </div>
    </div>
  )
}
