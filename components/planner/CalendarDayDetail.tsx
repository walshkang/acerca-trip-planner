'use client'

import { type DragEvent, useMemo } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { formatDayLabelFull } from '@/components/stitch/planner/planner-utils'
import {
  type PlannerSlot,
  PLANNER_SLOT_LABEL,
  PLANNER_SLOT_ORDER,
} from '@/lib/lists/planner'
import { groupItemsByPlannerSlot } from '@/lib/lists/calendar-day-detail'

type Props = {
  date: string
  items: ListItemRow[]
  resolveCategoryEmoji: (category: string) => string
  onPlaceSelect: (placeId: string) => void
  onMoveItem: (itemId: string) => void
  canDrag: boolean
  dropTargetKey: string | null
  onDragOverItem: (event: DragEvent, key: string) => void
  onDropReorder: (event: DragEvent, date: string, beforeItemId: string) => void
  onDropSlotSection: (event: DragEvent, date: string, slot: PlannerSlot) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
  savingItemId: string | null
}

function slotSectionKey(date: string, slot: PlannerSlot) {
  return `detail-slot:${date}:${slot}`
}

function itemDropKey(date: string, itemId: string) {
  return `detail-item:${date}:${itemId}`
}

export default function CalendarDayDetail({
  date,
  items,
  resolveCategoryEmoji,
  onPlaceSelect,
  onMoveItem,
  canDrag,
  dropTargetKey,
  onDragOverItem,
  onDropReorder,
  onDropSlotSection,
  onDragStartItem,
  onDragEndItem,
  savingItemId,
}: Props) {
  const { bySlot, unscheduled } = useMemo(() => groupItemsByPlannerSlot(items), [items])

  const sectionDropActive =
    'ring-2 ring-paper-primary bg-paper-surface-container rounded-[4px]'

  const renderItemCard = (item: ListItemRow) => {
    const place = item.place
    if (!place) return null
    const dropKey = itemDropKey(date, item.id)
    const isDropTarget = dropTargetKey === dropKey

    return (
      <div
        key={item.id}
        draggable={canDrag}
        onDragStart={(e) => {
          e.stopPropagation()
          onDragStartItem(item.id)
        }}
        onDragEnd={onDragEndItem}
        onDragOver={(e) => onDragOverItem(e, dropKey)}
        onDrop={(e) => {
          e.stopPropagation()
          onDropReorder(e, date, item.id)
        }}
        className={[
          'rounded-[4px] border px-2.5 py-2 transition',
          'border-paper-tertiary-fixed bg-paper-surface-container-low',
          isDropTarget ? sectionDropActive : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onPlaceSelect(place.id)}
          >
            <p className="truncate text-xs font-headline font-extrabold uppercase tracking-tight text-paper-on-surface">
              <span aria-hidden className="mr-1 text-[12px] leading-none">
                {resolveCategoryEmoji(place.category)}
              </span>
              {place.name}
            </p>
            {place.address ? (
              <p className="mt-0.5 truncate text-[10px] text-paper-on-surface-variant">
                {place.address}
              </p>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => onMoveItem(item.id)}
            disabled={savingItemId === item.id}
            className="shrink-0 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1 text-[11px] text-paper-on-surface transition hover:bg-paper-tertiary-fixed disabled:opacity-60"
          >
            Move
          </button>
        </div>
      </div>
    )
  }

  const renderSlotSection = (slot: PlannerSlot) => {
    const slotItems = bySlot[slot]
    const sectionKey = slotSectionKey(date, slot)
    const isSectionOver = dropTargetKey === sectionKey

    return (
      <div
        key={slot}
        className={['space-y-2 rounded-[4px] p-1', isSectionOver ? sectionDropActive : '']
          .filter(Boolean)
          .join(' ')}
        onDragOver={(e) => onDragOverItem(e, sectionKey)}
        onDrop={(e) => onDropSlotSection(e, date, slot)}
      >
        <h3 className="font-headline text-xs font-extrabold uppercase tracking-tight text-paper-on-surface">
          {PLANNER_SLOT_LABEL[slot]}
        </h3>
        <div className="min-h-[24px] space-y-1.5">
          {slotItems.length ? slotItems.map((item) => renderItemCard(item)) : (
            <p className="text-[11px] text-paper-on-surface-variant">No items</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="calendar-day-detail">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-headline text-sm font-extrabold uppercase tracking-tight text-paper-on-surface">
          {formatDayLabelFull(date)}
        </h2>
        <span className="text-[11px] text-paper-on-surface-variant tabular-nums">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {PLANNER_SLOT_ORDER.map((slot) => renderSlotSection(slot))}

      {unscheduled.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-headline text-xs font-extrabold uppercase tracking-tight text-paper-on-surface">
            Unscheduled
          </h3>
          <p className="text-[10px] text-paper-on-surface-variant">
            No time slot set — assign a slot by dragging into Morning, Afternoon, or Evening.
          </p>
          <div className="space-y-1.5">{unscheduled.map((item) => renderItemCard(item))}</div>
        </div>
      ) : null}
    </div>
  )
}
