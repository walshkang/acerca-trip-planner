import { type DragEvent } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'
import { useRoutingPreview } from '@/lib/routing/useRoutingPreview'
import { formatDayLabelFull, slotDotClassName, slotLabel } from './planner-utils'

type Props = {
  date: string
  items: ListItemRow[]
  listId: string | null
  canDrag: boolean
  dropTargetKey: string | null
  tone: 'light' | 'dark'
  resolveCategoryEmoji: (category: string) => string
  onPlaceSelect: (placeId: string) => void
  onMoveItem: (itemId: string) => void
  onBack: () => void
  showBackButton?: boolean
  onDragOverItem: (event: DragEvent, key: string) => void
  onDropReorder: (event: DragEvent, date: string, beforeItemId: string) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
  savingItemId: string | null
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function PlannerDayDetail({
  date,
  items,
  listId,
  canDrag,
  dropTargetKey,
  tone,
  resolveCategoryEmoji,
  onPlaceSelect,
  onMoveItem,
  onBack,
  showBackButton = true,
  onDragOverItem,
  onDropReorder,
  onDragStartItem,
  onDragEndItem,
  savingItemId,
}: Props) {
  const isDark = tone === 'dark'
  const routing = useRoutingPreview(listId, date, items.length >= 2)

  const headingClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const mutedClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const backClass = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'
  const cardBase = isDark ? 'border-white/10' : 'border-slate-200'
  const cardBg = isDark ? 'bg-slate-900/35' : 'bg-white/80'
  const cardDrop = isDark ? 'border-slate-200/40 bg-slate-900/55' : 'border-sky-400/40 bg-sky-50/50'
  const nameClass = isDark ? 'text-slate-100 hover:underline' : 'text-slate-900 hover:underline'
  const addressClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const moveBtn = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:border-white/25'
    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
  const badgeBg = isDark
    ? 'bg-slate-800/60 text-slate-400'
    : 'bg-slate-100 text-slate-500'
  const emptyClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const summaryClass = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="space-y-2 md:border-l md:border-paper-tertiary-fixed md:pl-3">
      <div className="flex items-center justify-between gap-2">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className={`text-[11px] md:text-paper-primary ${backClass}`}
          >
            ← Grid
          </button>
        ) : (
          <span />
        )}
        <h4
          className={`text-xs font-semibold md:font-headline md:font-extrabold md:uppercase md:tracking-tight ${headingClass}`}
        >
          {formatDayLabelFull(date)}
        </h4>
        <span className={`text-[11px] md:text-paper-on-surface-variant ${mutedClass}`}>
          {items.length}
        </span>
      </div>

      {routing.status === 'ok' && routing.summary && routing.summary.total_duration_s != null && routing.summary.total_distance_m != null ? (
        <div className={`text-[10px] md:text-paper-on-surface-variant ${summaryClass}`}>
          Total: {formatDuration(routing.summary.total_duration_s)},
          {' '}{(routing.summary.total_distance_m / 1000).toFixed(1)} km
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className={`text-[11px] md:text-paper-on-surface-variant ${emptyClass}`}>
          No places scheduled for this day. Drag from backlog or another day.
        </p>
      ) : null}

      <div className="space-y-1">
        {items.map((item, index) => {
          const place = item.place
          if (!place) return null
          const slot = slotFromScheduledStartTime(item.scheduled_start_time)
          const dropKey = `detail-item:${date}:${item.id}`
          const isDropTarget = dropTargetKey === dropKey
          const leg = routing.legsByToItemId.get(item.id)

          return (
            <div key={item.id}>
              {index > 0 && leg ? (
                <div className="flex items-center justify-center py-0.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] md:rounded-[2px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container ${badgeBg}`}
                  >
                    {formatDuration(leg.duration_s)}
                  </span>
                </div>
              ) : null}
              <div
                data-place-id={place.id}
                draggable={canDrag}
                onDragStart={() => onDragStartItem(item.id)}
                onDragEnd={onDragEndItem}
                onDragOver={(e) => onDragOverItem(e, dropKey)}
                onDrop={(e) => onDropReorder(e, date, item.id)}
                className={`rounded-lg border px-2.5 py-2 transition md:rounded-[4px] ${
                  isDropTarget
                    ? `${cardDrop} md:!border-paper-primary md:!bg-paper-surface-container`
                    : `${cardBase} ${cardBg} md:!border-paper-tertiary-fixed md:!bg-paper-surface-container-low`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 flex shrink-0 flex-col items-center gap-0.5 md:border-l-2 md:border-paper-primary md:pl-2">
                      <span
                        className={`h-2 w-2 rounded-full ${slotDotClassName(slot, tone)} md:!bg-paper-primary`}
                      />
                      <span
                        className={`text-[8px] font-black leading-none md:font-headline md:text-lg md:!text-paper-primary ${mutedClass}`}
                      >
                        {slotLabel(slot)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect(place.id)}
                    >
                      <p
                        className={`truncate text-xs font-medium md:font-headline md:font-extrabold md:uppercase md:tracking-tight ${nameClass}`}
                      >
                        <span aria-hidden className="mr-1 text-[12px]">
                          {resolveCategoryEmoji(place.category)}
                        </span>
                        {place.name}
                      </p>
                      {place.address ? (
                        <p
                          className={`mt-0.5 truncate text-[10px] md:text-[11px] md:text-paper-on-surface-variant ${addressClass}`}
                        >
                          {place.address}
                        </p>
                      ) : null}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMoveItem(item.id)}
                    disabled={savingItemId === item.id}
                    className={`shrink-0 rounded-md border px-2 py-1 text-[11px] disabled:opacity-60 md:rounded-[4px] md:!border-paper-tertiary-fixed md:!bg-paper-surface-container md:!text-paper-on-surface hover:md:!bg-paper-tertiary-fixed ${moveBtn}`}
                  >
                    Move
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
