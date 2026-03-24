import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { formatDayLabel } from './planner-utils'

type Props = {
  item: ListItemRow
  tripDates: string[] | null
  tone: 'light' | 'dark'
  savingItemId: string | null
  onMoveBacklog: () => void
  onMoveDone: () => void
  onMoveToDay: (date: string) => void
  onClose: () => void
  error: string | null
}

export default function PlannerMovePicker({
  item,
  tripDates,
  tone,
  savingItemId,
  onMoveBacklog,
  onMoveDone,
  onMoveToDay,
  onClose,
  error,
}: Props) {
  const isDark = tone === 'dark'
  const place = item.place
  const isSaving = savingItemId === item.id
  const plannerToneClass = isDark ? '' : 'planner-light'

  const headingClass = isDark ? 'text-slate-200' : 'text-slate-700'
  const mutedClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const backClass = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'
  const dayBtn = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:border-white/25'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
  const currentDayBtn = isDark
    ? 'border-sky-400/40 bg-sky-900/30 text-sky-200'
    : 'border-sky-500/40 bg-sky-50 text-sky-700'

  return (
    <div className={`p-3 ${plannerToneClass}`} data-testid="planner-move-picker">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`text-xs ${backClass}`}
        >
          Back
        </button>
        <p className={`truncate text-xs ${headingClass}`}>
          Move {place?.name ?? 'item'}
        </p>
        <span className="w-10" />
      </div>

      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onMoveBacklog}
            disabled={isSaving}
            className="glass-button w-full disabled:opacity-60 md:rounded-[4px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface md:shadow-none md:backdrop-blur-none hover:md:bg-paper-tertiary-fixed"
          >
            Backlog
          </button>
          <button
            type="button"
            onClick={onMoveDone}
            disabled={isSaving}
            className="glass-button w-full disabled:opacity-60 md:rounded-[4px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface md:shadow-none md:backdrop-blur-none hover:md:bg-paper-tertiary-fixed"
          >
            Done
          </button>
        </div>

        {tripDates && tripDates.length > 0 ? (
          <div className="space-y-2">
            <p className={`text-[11px] font-semibold ${headingClass}`}>
              Trip days
            </p>
            <div className="grid grid-cols-4 gap-1.5 md:grid-cols-7">
              {tripDates.map((date) => {
                const isCurrent = item.scheduled_date === date
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onMoveToDay(date)}
                    disabled={isSaving}
                    className={`rounded-md border px-1.5 py-1.5 text-[10px] font-medium transition disabled:opacity-60 md:rounded-[2px] ${
                      isCurrent
                        ? `${currentDayBtn} md:!border-paper-primary md:!bg-paper-surface md:!text-paper-primary`
                        : `${dayBtn} md:!border-paper-tertiary-fixed md:!bg-paper-surface-container md:!text-paper-on-surface hover:md:!bg-white`
                    }`}
                  >
                    {formatDayLabel(date)}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className={`text-[11px] ${mutedClass}`}>
            Set trip dates to schedule by day.
          </p>
        )}

        {error ? (
          <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
