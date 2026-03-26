/** Relative label for "last fetched" planner data (async collab freshness). */
export function formatPlannerFreshnessLabel(nowMs: number, lastFetchedAt: number): string {
  const seconds = Math.floor((nowMs - lastFetchedAt) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
