import { parseIsoDateOnly } from '@/lib/lists/planner'

/** Monday = 0 … Sunday = 6 (UTC, ISO calendar date). */
export function utcWeekdayMon0(isoDate: string): number {
  const parsed = parseIsoDateOnly(isoDate)
  if (!parsed) throw new Error(`Invalid ISO date: ${isoDate}`)
  const d = new Date(`${parsed}T00:00:00Z`)
  const sun0 = d.getUTCDay()
  return (sun0 + 6) % 7
}

export function addUtcDays(isoDate: string, delta: number): string {
  const parsed = parseIsoDateOnly(isoDate)
  if (!parsed) throw new Error(`Invalid ISO date: ${isoDate}`)
  const t = new Date(`${parsed}T00:00:00Z`).getTime() + delta * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

/** Monday (UTC) of the week that contains `isoDate`. */
export function utcMondayOfWeek(isoDate: string): string {
  const parsed = parseIsoDateOnly(isoDate)
  if (!parsed) return isoDate
  const mon0 = utcWeekdayMon0(parsed)
  return addUtcDays(parsed, -mon0)
}

/** Sunday (UTC) of the week that contains `isoDate`. */
export function utcSundayOfWeek(isoDate: string): string {
  const mon = utcMondayOfWeek(isoDate)
  return addUtcDays(mon, 6)
}

export type CalendarWeekRow = { cells: string[] }

/**
 * Week rows from Monday of the week containing trip start through Sunday of the week
 * containing trip end (UTC), aligned with `enumerateIsoDatesInclusive`.
 */
export function buildCalendarWeekRows(
  tripStart: string,
  tripEnd: string
): CalendarWeekRow[] | null {
  const s = parseIsoDateOnly(tripStart)
  const e = parseIsoDateOnly(tripEnd)
  if (!s || !e || s > e) return null

  const gridStart = utcMondayOfWeek(s)
  const gridEndSunday = utcSundayOfWeek(e)

  const rows: CalendarWeekRow[] = []
  let cursor = gridStart
  while (cursor <= gridEndSunday) {
    const cells: string[] = []
    for (let i = 0; i < 7; i++) {
      cells.push(addUtcDays(cursor, i))
    }
    rows.push({ cells })
    cursor = addUtcDays(cursor, 7)
  }
  return rows
}
