const SHORT_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** e.g. Wed 26 (UTC calendar date). */
export function formatUtcShortDayDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const day = SHORT_DOW[d.getUTCDay()]
  const n = Number.parseInt(isoDate.slice(8, 10), 10)
  return `${day} ${n}`
}

/** e.g. Wed, Feb 26 (UTC). */
export function formatUtcLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
