'use client'

import type { CalendarView } from '@/components/planner/calendar-view'

const OPTIONS: { value: CalendarView; label: string }[] = [
  { value: '3day', label: '3 Day' },
  { value: 'week', label: 'Week' },
  { value: '2week', label: '2 Week' },
  { value: 'agenda', label: 'Agenda' },
]

type Props = {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
}

export default function CalendarViewToggle({ view, onViewChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className="flex shrink-0 rounded-[4px] border border-paper-tertiary-fixed p-px"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = view === value
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onViewChange(value)}
            className={[
              'rounded-[3px] px-2 py-1 font-headline text-[10px] font-extrabold uppercase tracking-tight transition-colors',
              active
                ? 'bg-paper-primary text-paper-on-primary'
                : 'text-paper-on-surface-variant hover:bg-paper-surface-container',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
