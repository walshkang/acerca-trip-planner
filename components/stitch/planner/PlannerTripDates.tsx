'use client'

import { useEffect, useState } from 'react'
import type { ListSummary } from '@/components/stitch/ListDetailBody'
import {
  daysBetweenInclusive,
  formatDateRange,
  friendlyTimezoneName,
} from '@/lib/lists/date-display'

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

const TRAVEL_TIMEZONE_GROUPS: { region: string; zones: string[] }[] = [
  {
    region: 'Americas',
    zones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Honolulu',
    ],
  },
  {
    region: 'Europe',
    zones: [
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Istanbul',
    ],
  },
  {
    region: 'Asia',
    zones: [
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Bangkok',
      'Asia/Dubai',
      'Asia/Kolkata',
    ],
  },
  {
    region: 'Australia / Pacific',
    zones: ['Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'],
  },
]

const PRESET_IANA = new Set(TRAVEL_TIMEZONE_GROUPS.flatMap((g) => g.zones))

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
  const selectClass = `${dateInputClass} py-1.5`
  const otherInputClass =
    'glass-input w-full text-xs md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant'
  const panelBorderClass = isDark
    ? 'border-white/10 bg-white/5'
    : 'border-slate-200 bg-slate-50/50'

  const [timezoneUseOther, setTimezoneUseOther] = useState(false)

  useEffect(() => {
    if (!editingTripDates) return
    const t = tripTimezone.trim()
    setTimezoneUseOther(t !== '' && !PRESET_IANA.has(t))
  }, [editingTripDates, tripTimezone])

  const onStartChange = (value: string) => {
    if (tripEnd && value > tripEnd) {
      setTripEnd('')
    }
    setTripStart(value)
  }

  const durationClass = isDark ? 'text-slate-400' : 'text-paper-on-surface-variant'
  const rangeTextClass = isDark
    ? 'font-headline text-xs font-extrabold text-slate-100'
    : 'font-headline text-xs font-extrabold text-paper-on-surface'

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
                onChange={(e) => onStartChange(e.target.value)}
                className={dateInputClass}
                disabled={savingTripDates}
              />
            </label>
            <label className={`space-y-1 text-[11px] ${mutedClass}`}>
              <span>End</span>
              <input
                type="date"
                value={tripEnd}
                min={tripStart || undefined}
                onChange={(e) => setTripEnd(e.target.value)}
                className={dateInputClass}
                disabled={savingTripDates}
              />
            </label>
          </div>
          <div className={`space-y-1 text-[11px] ${mutedClass}`}>
            <span>Timezone</span>
            <select
              value={timezoneUseOther ? '__other__' : tripTimezone}
              onChange={(e) => {
                const v = e.target.value
                if (v === '__other__') {
                  setTimezoneUseOther(true)
                } else {
                  setTimezoneUseOther(false)
                  setTripTimezone(v)
                }
              }}
              className={selectClass}
              disabled={savingTripDates}
            >
              <option value="">Select timezone</option>
              {TRAVEL_TIMEZONE_GROUPS.map(({ region, zones }) => (
                <optgroup key={region} label={region}>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__other__">Other…</option>
            </select>
            {timezoneUseOther ? (
              <input
                value={tripTimezone}
                onChange={(e) => setTripTimezone(e.target.value)}
                className={`mt-1 ${otherInputClass}`}
                placeholder="IANA, e.g. Europe/Amsterdam"
                disabled={savingTripDates}
              />
            ) : null}
          </div>
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
      ) : list?.start_date && list?.end_date ? (
        <div className={`mt-2 flex flex-wrap items-baseline gap-x-1 text-[11px] ${mutedClass}`}>
          <span className={rangeTextClass}>
            {formatDateRange(list.start_date, list.end_date)}
          </span>
          {(() => {
            const n = daysBetweenInclusive(list.start_date, list.end_date)
            return n != null ? (
              <span className={durationClass}>{`(${n} day${n === 1 ? '' : 's'})`}</span>
            ) : null
          })()}
          {list.timezone ? (
            <>
              <span className={durationClass} aria-hidden>
                {' '}
                ·{' '}
              </span>
              <span>{friendlyTimezoneName(list.timezone)}</span>
            </>
          ) : null}
        </div>
      ) : list?.start_date || list?.end_date ? (
        <div className={`mt-2 text-[11px] ${mutedClass}`}>
          <span className={rangeTextClass}>
            {formatDateRange(list.start_date ?? '', list.end_date ?? '')}
          </span>
          {list.timezone ? (
            <>
              <span className={durationClass}>{' · '}</span>
              <span>{friendlyTimezoneName(list.timezone)}</span>
            </>
          ) : null}
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
