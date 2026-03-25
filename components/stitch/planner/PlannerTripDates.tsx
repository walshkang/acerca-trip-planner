import type { ListSummary } from '@/components/stitch/ListDetailBody'

type Props = {
  list: ListSummary | null
  tone: 'light' | 'dark'
  editingTripDates: boolean
  setEditingTripDates: (editing: boolean) => void
  tripStart: string
  setTripStart: (value: string) => void
  tripEnd: string
  setTripEnd: (value: string) => void
  tripTimezone: string
  setTripTimezone: (value: string) => void
  savingTripDates: boolean
  onSave: () => void
  onClear: () => void
  error: string | null
}

export default function PlannerTripDates({
  list,
  tone,
  editingTripDates,
  setEditingTripDates,
  tripStart,
  setTripStart,
  tripEnd,
  setTripEnd,
  tripTimezone,
  setTripTimezone,
  savingTripDates,
  onSave,
  onClear,
  error,
}: Props) {
  const isDark = tone === 'dark'
  const headingClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const mutedClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const linkClass = isDark
    ? 'text-slate-300 underline hover:text-slate-100'
    : 'text-slate-600 underline hover:text-slate-900'
  const dateInputClass = isDark
    ? 'glass-input w-full text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface'
    : 'glass-input w-full text-xs [color-scheme:light] md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface'
  const panelBorderClass = isDark
    ? 'border-white/10 bg-white/5'
    : 'border-slate-200 bg-slate-50/50'

  return (
    <div
      className={`rounded-lg border p-3 md:rounded-[4px] ${panelBorderClass} md:border-paper-tertiary-fixed md:bg-paper-surface-container-low`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold md:font-headline md:text-xs md:font-extrabold md:uppercase md:tracking-tighter ${headingClass}`}
          >
            Trip Dates
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {list?.start_date && list?.end_date ? (
            <button
              type="button"
              onClick={() => setEditingTripDates(!editingTripDates)}
              className={`text-[11px] ${linkClass}`}
            >
              {editingTripDates ? 'Close' : 'Edit dates'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTripDates(true)}
              className={`text-[11px] ${linkClass}`}
            >
              Set dates
            </button>
          )}
        </div>
      </div>

      {editingTripDates ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className={`space-y-1 text-[11px] ${mutedClass}`}>
              <span>Start</span>
              <input
                type="date"
                value={tripStart}
                onChange={(e) => setTripStart(e.target.value)}
                className={dateInputClass}
                disabled={savingTripDates}
              />
            </label>
            <label className={`space-y-1 text-[11px] ${mutedClass}`}>
              <span>End</span>
              <input
                type="date"
                value={tripEnd}
                onChange={(e) => setTripEnd(e.target.value)}
                className={dateInputClass}
                disabled={savingTripDates}
              />
            </label>
          </div>
          <label className={`space-y-1 text-[11px] ${mutedClass}`}>
            <span>Timezone (IANA)</span>
            <input
              value={tripTimezone}
              onChange={(e) => setTripTimezone(e.target.value)}
              className="glass-input w-full text-xs md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant"
              placeholder="America/New_York"
              disabled={savingTripDates}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={savingTripDates}
              className="glass-button disabled:opacity-60 md:!rounded-[4px] md:!border-0 md:!bg-paper-primary md:!text-paper-on-primary md:px-4 md:py-2 md:text-xs md:font-bold md:uppercase md:tracking-widest md:shadow-none md:backdrop-blur-none hover:md:!bg-paper-primary-container"
            >
              {savingTripDates ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={savingTripDates}
              className={`text-[11px] ${linkClass} disabled:opacity-60`}
            >
              Clear
            </button>
          </div>
          {error ? (
            <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>
              {error}
            </p>
          ) : null}
        </div>
      ) : list?.start_date || list?.end_date ? (
        <div className={`mt-2 text-[11px] ${mutedClass}`}>
          {list.start_date ?? '\u2014'} \u2192 {list.end_date ?? '\u2014'}
          {list.timezone ? ` \u00b7 ${list.timezone}` : null}
        </div>
      ) : (
        <p className={`mt-2 text-[11px] ${mutedClass}`}>
          Set trip dates to schedule by day. Backlog and Done are always
          available.
        </p>
      )}
    </div>
  )
}
