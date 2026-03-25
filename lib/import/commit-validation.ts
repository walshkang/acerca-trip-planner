/**
 * List trip bounds for import commit: ISO date strings (YYYY-MM-DD) compare lexicographically.
 */
export function scheduledDateOutsideListTripBounds(
  scheduledDate: string,
  list: { start_date: string | null; end_date: string | null }
): boolean {
  if (list.start_date && scheduledDate < list.start_date) return true
  if (list.end_date && scheduledDate > list.end_date) return true
  return false
}
