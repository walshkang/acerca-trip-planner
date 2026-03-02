import type { CategoryEnum } from '@/lib/types/enums'
import { PLANNER_CATEGORY_ORDER, PLANNER_SLOT_LABEL } from '@/lib/lists/planner'
import type { ExportRow } from './contract'
import { CATEGORY_EMOJI } from './contract'

export type ListContext = {
  name: string
  start_date: string | null
  end_date: string | null
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null

  const startDate = new Date(`${start}T00:00:00Z`)
  const monthShort = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const dayNum = (d: Date) => d.getUTCDate()

  if (!end || end === start) {
    return `${monthShort(startDate)} ${dayNum(startDate)}`
  }

  const endDate = new Date(`${end}T00:00:00Z`)
  if (startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${monthShort(startDate)} ${dayNum(startDate)}–${dayNum(endDate)}`
  }
  return `${monthShort(startDate)} ${dayNum(startDate)} – ${monthShort(endDate)} ${dayNum(endDate)}`
}

/**
 * Serialize export rows as plain text grouped by neighborhood.
 * Designed to be tappable from any chat/notes app.
 */
export function serializeClipboard(rows: ExportRow[], list: ListContext): string {
  const dateRange = formatDateRange(list.start_date, list.end_date)
  const header = dateRange ? `🗺️ ${list.name} (${dateRange})` : `🗺️ ${list.name}`

  // Group by neighborhood
  const byNeighborhood = new Map<string, ExportRow[]>()
  for (const row of rows) {
    const hood = row.place_neighborhood ?? 'Unknown Neighborhood'
    const existing = byNeighborhood.get(hood)
    if (existing) {
      existing.push(row)
    } else {
      byNeighborhood.set(hood, [row])
    }
  }

  const lines: string[] = [header, '']

  for (const [hood, hoodRows] of byNeighborhood) {
    lines.push(`📍 ${hood}`)
    for (const row of hoodRows) {
      const emoji = CATEGORY_EMOJI[row.place_category]
      lines.push(`  ${emoji} ${row.place_name} — ${row.place_category}`)
      if (row.google_maps_url) {
        lines.push(`     ${row.google_maps_url}`)
      }
    }
    lines.push('')
  }

  // Build footer
  const totalCount = rows.length
  const categoryCounts = new Map<CategoryEnum, number>()
  for (const row of rows) {
    categoryCounts.set(row.place_category, (categoryCounts.get(row.place_category) ?? 0) + 1)
  }

  const categoryParts: string[] = []
  for (const cat of PLANNER_CATEGORY_ORDER) {
    const count = categoryCounts.get(cat)
    if (count) categoryParts.push(`${count} ${cat}`)
  }

  lines.push('—')
  lines.push(
    `${totalCount} place${totalCount !== 1 ? 's' : ''}${categoryParts.length ? ' · ' + categoryParts.join(' · ') : ''}`
  )

  return lines.join('\n')
}

export { PLANNER_SLOT_LABEL }
