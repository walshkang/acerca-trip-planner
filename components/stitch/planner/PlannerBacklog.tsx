import { type DragEvent, useState } from 'react'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'

type Props = {
  items: ListItemRow[]
  canDrag: boolean
  isDragOver: boolean
  tone: 'light' | 'dark'
  resolveCategoryEmoji: (category: string) => string
  onPlaceSelect: (placeId: string) => void
  onMoveItem: (itemId: string) => void
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  onDragStartItem: (itemId: string) => void
  onDragEndItem: () => void
  savingItemId: string | null
}

export default function PlannerBacklog({
  items,
  canDrag,
  isDragOver,
  tone,
  resolveCategoryEmoji,
  onPlaceSelect,
  onMoveItem,
  onDragOver,
  onDrop,
  onDragStartItem,
  onDragEndItem,
  savingItemId,
}: Props) {
  const isDark = tone === 'dark'
  const [collapsed, setCollapsed] = useState(false)

  const headingClass = isDark ? 'text-slate-200' : 'text-slate-700'
  const countClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const emptyClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const cardBorder = isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/80'
  const nameClass = isDark ? 'text-slate-100 hover:underline' : 'text-slate-900 hover:underline'
  const metaClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const moveBtn = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:border-white/25'
    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
  const dropHighlight = isDark
    ? 'bg-slate-100/10 ring-1 ring-slate-200/40'
    : 'bg-sky-50 ring-1 ring-sky-300/50'

  return (
    <section data-testid="planner-backlog" className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2"
      >
        <h3 className={`text-xs font-semibold ${headingClass}`}>
          Backlog
          <span className={`ml-1.5 font-normal ${countClass}`}>
            {items.length}
          </span>
        </h3>
        <span className={`text-[11px] ${countClass}`}>
          {collapsed ? '\u25b6' : '\u25bc'}
        </span>
      </button>

      {!collapsed ? (
        <div
          className={`space-y-1.5 rounded-md p-1 transition ${isDragOver ? dropHighlight : ''}`}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {items.length ? (
            items.map((item) => {
              const place = item.place!
              return (
                <div
                  key={item.id}
                  draggable={canDrag}
                  onDragStart={() => onDragStartItem(item.id)}
                  onDragEnd={onDragEndItem}
                  className={`rounded-lg border px-2.5 py-1.5 ${cardBorder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect(place.id)}
                    >
                      <p className={`truncate text-xs font-medium ${nameClass}`}>
                        {place.name}
                      </p>
                      <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${metaClass}`}>
                        <span aria-hidden className="text-[12px] leading-none">
                          {resolveCategoryEmoji(place.category)}
                        </span>
                        <span>{place.category}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveItem(item.id)}
                      disabled={savingItemId === item.id}
                      className={`shrink-0 rounded-md border px-2 py-1 text-[11px] disabled:opacity-60 ${moveBtn}`}
                    >
                      Move
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <p className={`text-[11px] ${emptyClass}`}>Nothing in backlog.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
