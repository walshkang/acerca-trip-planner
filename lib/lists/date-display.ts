import { countIsoDatesInclusive, parseIsoDateOnly } from '@/lib/lists/planner'

/** Count days between two ISO date-only strings, inclusive. Delegates to planner helper. */
export function daysBetweenInclusive(start: string, end: string): number | null {
  return countIsoDatesInclusive(start, end)
}

function utcDateFromIsoDateOnly(iso: string): Date | null {
  const normalized = parseIsoDateOnly(iso.trim())
  if (!normalized) return null
  const [y, m, d] = normalized.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * Format ISO date-only range for display, e.g. "Feb 22 – Mar 1, 2026".
 * Uses UTC calendar dates so local timezone does not shift the day.
 */
export function formatDateRange(start: string, end: string): string {
  const ds = utcDateFromIsoDateOnly(start)
  const de = utcDateFromIsoDateOnly(end)
  if (!ds || !de) {
    const a = start.trim() || '—'
    const b = end.trim() || '—'
    return `${a} – ${b}`
  }

  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const monthDayYear = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const ys = ds.getUTCFullYear()
  const ye = de.getUTCFullYear()
  if (ys === ye) {
    return `${monthDay.format(ds)} – ${monthDayYear.format(de)}`
  }
  return `${monthDayYear.format(ds)} – ${monthDayYear.format(de)}`
}

/** Human-friendly timezone label from IANA id, e.g. "America/New_York" → "Eastern Time". */
export function friendlyTimezoneName(iana: string): string {
  const tz = iana.trim()
  if (!tz) return tz
  const ref = new Date('2024-06-15T12:00:00Z')
  try {
    for (const timeZoneName of ['longGeneric', 'long'] as const) {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName,
      })
      const name = dtf.formatToParts(ref).find((p) => p.type === 'timeZoneName')?.value
      if (name) return name
    }
  } catch {
    // fall through
  }
  return tz
}
