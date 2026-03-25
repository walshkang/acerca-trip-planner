import { addUtcDays, buildCalendarWeekRows, utcMondayOfWeek } from '@/lib/lists/calendar-week'

export type ThreeDayWindow = {
  windowStart: string
  /** 1–3 visible columns */
  dayCount: number
  canShift: boolean
}

/**
 * Largest start W ≤ anchor such that W..W+2 ⊆ [tripStart, tripEnd] (ISO dates).
 * Short trips: single window at tripStart with dayCount < 3, no shifting.
 */
export function computeThreeDayWindow(
  tripStart: string,
  tripEnd: string,
  anchor: string,
  tripDayCount: number
): ThreeDayWindow {
  if (tripDayCount < 1) {
    return { windowStart: tripStart, dayCount: 0, canShift: false }
  }
  if (tripDayCount < 3) {
    return { windowStart: tripStart, dayCount: tripDayCount, canShift: false }
  }

  const lastStart = addUtcDays(tripEnd, -2)
  let a = anchor
  if (a < tripStart) a = tripStart
  if (a > tripEnd) a = tripEnd
  let w = a <= lastStart ? a : lastStart
  if (w < tripStart) w = tripStart
  if (w > lastStart) w = lastStart

  return { windowStart: w, dayCount: 3, canShift: tripDayCount > 3 }
}

export function shiftThreeDayWindow(
  tripStart: string,
  tripEnd: string,
  currentStart: string,
  direction: 'prev' | 'next',
  tripDayCount: number
): string {
  if (tripDayCount < 3) return currentStart
  const lastStart = addUtcDays(tripEnd, -2)
  const delta = direction === 'prev' ? -1 : 1
  let next = addUtcDays(currentStart, delta)
  if (next < tripStart) next = tripStart
  if (next > lastStart) next = lastStart
  return next
}

/** Valid Monday starts for 2-week view; one entry if trip ≤ 2 calendar rows. */
export function twoWeekWindowMondays(tripStart: string, tripEnd: string): string[] {
  const rows = buildCalendarWeekRows(tripStart, tripEnd)
  if (!rows?.length) return []

  if (rows.length <= 2) {
    return [rows[0]!.cells[0]!]
  }

  const mondays: string[] = []
  for (let k = 0; k <= rows.length - 2; k++) {
    mondays.push(rows[k]!.cells[0]!)
  }
  return mondays
}

export function initialTwoWeekMonday(
  tripStart: string,
  tripEnd: string,
  anchor: string
): string {
  const mondays = twoWeekWindowMondays(tripStart, tripEnd)
  if (!mondays.length) return utcMondayOfWeek(anchor)
  const target = utcMondayOfWeek(anchor)
  for (let i = mondays.length - 1; i >= 0; i--) {
    if (mondays[i]! <= target) return mondays[i]!
  }
  return mondays[0]!
}

export function shiftTwoWeekMonday(
  currentMonday: string,
  direction: 'prev' | 'next',
  mondays: string[]
): string {
  if (mondays.length <= 1) return currentMonday
  const i = mondays.indexOf(currentMonday)
  if (i < 0) return mondays[0]!
  if (direction === 'prev') return mondays[Math.max(0, i - 1)]!
  return mondays[Math.min(mondays.length - 1, i + 1)]!
}

export function twoWeekShowsNavigation(tripStart: string, tripEnd: string): boolean {
  const rows = buildCalendarWeekRows(tripStart, tripEnd)
  return Boolean(rows && rows.length > 2)
}
