'use client'

import type { DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'

const MAX_VISIBLE_ITEMS = 5
/** Taller cells so previews + slot bars + emoji read clearly */
const CELL_MIN_HEIGHT = 'min-h-[148px]'

export type DayCellProps = {
  date: string
  items: ListItemRow[]
  isSelected: boolean
  isToday: boolean
  isDragOver: boolean
  canDrag: boolean
  resolveCategoryEmoji: (category: string) => string
  onClick: () => void
  onDragOverDay: (event: DragEvent, date: string) => void
  onDropDay: (event: DragEvent, date: string) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
  dragItemId: string | null
}

function dayOfMonth(iso: string): string {
  const tail = iso.slice(8, 10)
  return String(Number.parseInt(tail, 10))
}

export default function DayCell({
  date,
  items,
  isSelected,
  isToday,
  isDragOver,
  canDrag,
  resolveCategoryEmoji,
  onClick,
  onDragOverDay,
  onDropDay,
  onDragStartItem,
  onDragEndItem,
  dragItemId,
}: DayCellProps) {
  const n = items.length
  const density: 'empty' | 'light' | 'packed' =
    n === 0 ? 'empty' : n <= 2 ? 'light' : 'packed'

  const baseBorder =
    density === 'packed'
      ? 'border-paper-primary/40 border-l-2 border-l-paper-primary'
      : 'border-paper-tertiary-fixed'

  const bgClass = isToday
    ? 'bg-paper-primary/10'
    : density === 'empty'
      ? 'bg-paper-surface-container-low'
      : 'bg-paper-surface'

  const previews = items.slice(0, MAX_VISIBLE_ITEMS)
  const overflowCount = n > MAX_VISIBLE_ITEMS ? n - MAX_VISIBLE_ITEMS : 0

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="planner-day-cell"
      data-day={date}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      onDragOver={(e) => onDragOverDay(e, date)}
      onDrop={(e) => onDropDay(e, date)}
      className={[
        'flex w-full cursor-pointer flex-col gap-1.5 rounded-[4px] border p-2 text-left font-body transition',
        CELL_MIN_HEIGHT,
        baseBorder,
        bgClass,
        'text-paper-on-surface',
        isSelected ? 'ring-2 ring-paper-primary ring-offset-1 ring-offset-paper-surface' : '',
        isDragOver ? 'ring-2 ring-paper-primary bg-paper-surface-container' : '',
        'hover:bg-paper-surface-container',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-end">
        <span className="font-headline text-lg font-extrabold tabular-nums leading-none">
          {dayOfMonth(date)}
        </span>
      </div>
      {n > 0 ? (
        <span className="inline-flex w-fit items-center rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-paper-on-surface-variant">
          {n}
        </span>
      ) : null}
      <ul className="min-h-0 flex-1 space-y-1">
        {previews.map((item) => {
          const place = item.place
          const name = place?.name
          if (!name) return null
          const slot = slotFromScheduledStartTime(item.scheduled_start_time)
          const emoji = place?.category != null ? resolveCategoryEmoji(place.category) : ''
          const isDraggingThis = dragItemId === item.id
          return (
            <li key={item.id} className="min-w-0">
              <div
                draggable={canDrag}
                data-dragging={isDraggingThis ? 'true' : undefined}
                title={canDrag ? `${name} — drag to move` : name}
                onDragStart={(e) => {
                  e.stopPropagation()
                  onDragStartItem(item.id)
                }}
                onDragEnd={onDragEndItem}
                className={[
                  'flex min-w-0 items-center gap-1.5 rounded-[2px] py-0.5 pr-0.5 text-[11px] leading-snug text-paper-on-surface transition-[box-shadow] duration-150',
                  canDrag ? 'cursor-grab active:cursor-grabbing' : '',
                  isDraggingThis
                    ? 'z-[1] ring-2 ring-paper-primary ring-offset-1 ring-offset-paper-surface'
                    : canDrag
                      ? 'ring-1 ring-transparent hover:ring-2 hover:ring-paper-primary/60 hover:ring-offset-1 hover:ring-offset-paper-surface'
                      : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* Slot colors align with PlannerDayCell dots: morning=amber, afternoon=slate, evening=indigo */}
                <span
                  aria-hidden
                  className={[
                    'h-3.5 w-[3px] shrink-0 rounded-full',
                    slot === 'morning' && 'bg-amber-500',
                    slot === 'afternoon' && 'bg-slate-500',
                    slot === 'evening' && 'bg-indigo-500',
                    !slot && 'bg-slate-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
                {emoji ? (
                  <span className="shrink-0 text-[12px] leading-none" aria-hidden>
                    {emoji}
                  </span>
                ) : null}
                <span className="min-w-0 truncate">{name}</span>
              </div>
            </li>
          )
        })}
        {overflowCount > 0 ? (
          <li className="text-[10px] text-paper-on-surface-variant">+{overflowCount} more</li>
        ) : null}
      </ul>
    </div>
  )
}
