'use client'

import type { DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { formatUtcLongDate } from '@/lib/lists/calendar-display'
import { sortItemsForDayCellDisplay } from '@/lib/lists/calendar-day-detail'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'

type Props = {
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

export default function CalendarAgendaView({
  tripDates,
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
  return (
    <section aria-label="Trip agenda" className="space-y-0" data-testid="planner-agenda-view">
      {tripDates.map((date) => {
        const raw = itemsByDate.get(date) ?? []
        const dayItems = sortItemsForDayCellDisplay(raw)
        const n = dayItems.length
        const dayKey = `day:${date}`
        const isSelected = selectedDay === date
        const isToday = todayIso === date
        const isDragOver = dropTargetKey === dayKey

        return (
          <div
            key={date}
            className={[
              'border-b border-paper-tertiary-fixed px-0 py-3 transition-colors',
              isSelected ? 'bg-paper-surface-container' : '',
              isToday && !isSelected ? 'bg-paper-primary/10' : '',
              isDragOver ? 'ring-2 ring-inset ring-paper-primary bg-paper-surface-container' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onDragOver={(e) => onDragOverDay(e, date)}
            onDrop={(e) => onDropDay(e, date)}
          >
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-2 text-left"
              onClick={() => onSelectDay(date)}
            >
              <span className="font-headline text-sm font-extrabold uppercase tracking-tight text-paper-on-surface">
                {formatUtcLongDate(date)}
              </span>
              <span className="shrink-0 tabular-nums font-headline text-sm font-extrabold text-paper-on-surface-variant">
                {n}
              </span>
            </button>
            <div className="mt-2 space-y-1">
              {n > 0 ? (
                <ul className="space-y-1">
                  {dayItems.map((item) => {
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
                            'flex min-w-0 items-center gap-1.5 rounded-[2px] border border-paper-tertiary-fixed bg-paper-surface-container-low px-2 py-1.5 text-[11px] leading-snug text-paper-on-surface transition-[box-shadow] duration-150',
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
                </ul>
              ) : (
                <p className="text-[11px] text-paper-on-surface-variant">No places scheduled</p>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
