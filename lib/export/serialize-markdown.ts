import { PLANNER_CATEGORY_ORDER, PLANNER_SLOT_LABEL } from '@/lib/lists/planner'
import type { ExportRow } from './contract'
import { CATEGORY_EMOJI } from './contract'
import type { ListContext } from './serialize-clipboard'

function placeMarkdownLine(row: ExportRow, showNeighborhood = false): string {
  const namePart = `**${row.place_name}**`
  const neighborhoodPart =
    showNeighborhood && row.place_neighborhood ? ` — ${row.place_neighborhood}` : ''
  const categoryPart = !showNeighborhood ? ` — ${row.place_category}` : ''

  const links: string[] = []
  if (row.google_maps_url) links.push(`[Google Maps](${row.google_maps_url})`)
  if (row.website) links.push(`[Website](${row.website})`)
  const linkPart = links.length ? ` · ${links.join(' · ')}` : ''

  const allTags = [...row.place_user_tags, ...row.item_tags]
  const tagPart = allTags.length ? ` \`${allTags.join('`  `')}\`` : ''

  const scheduledPart =
    row.scheduled_date && row.scheduled_slot
      ? ` _(${row.scheduled_date} ${PLANNER_SLOT_LABEL[row.scheduled_slot]})_`
      : row.scheduled_date
        ? ` _(${row.scheduled_date})_`
        : ''

  const mainLine = `- ${namePart}${neighborhoodPart}${categoryPart}${linkPart}${tagPart}${scheduledPart}`

  if (row.place_user_notes) {
    return `${mainLine}\n  > ${row.place_user_notes}`
  }
  return mainLine
}

/**
 * Serialize export rows as Markdown with two sections:
 *   1. By Neighborhood — "Where could I wander?"
 *   2. By Category — "What am I in the mood for?"
 */
export function serializeMarkdown(rows: ExportRow[], list: ListContext): string {
  const lines: string[] = [`# ${list.name}`, '']

  // Section 1: By Neighborhood
  lines.push('## By Neighborhood', '')

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

  for (const [hood, hoodRows] of byNeighborhood) {
    lines.push(`### 📍 ${hood}`, '')
    for (const row of hoodRows) {
      const emoji = CATEGORY_EMOJI[row.place_category]
      lines.push(`${emoji} ${placeMarkdownLine(row)}`)
    }
    lines.push('')
  }

  // Section 2: By Category
  lines.push('## By Category', '')

  const byCategory = new Map<string, ExportRow[]>()
  for (const row of rows) {
    const existing = byCategory.get(row.place_category)
    if (existing) {
      existing.push(row)
    } else {
      byCategory.set(row.place_category, [row])
    }
  }

  for (const cat of PLANNER_CATEGORY_ORDER) {
    const catRows = byCategory.get(cat)
    if (!catRows?.length) continue
    const emoji = CATEGORY_EMOJI[cat]
    lines.push(`### ${emoji} ${cat}`, '')
    for (const row of catRows) {
      lines.push(placeMarkdownLine(row, true))
    }
    lines.push('')
  }

  // Handle categories not in PLANNER_CATEGORY_ORDER
  for (const [cat, catRows] of byCategory) {
    if (PLANNER_CATEGORY_ORDER.includes(cat as (typeof PLANNER_CATEGORY_ORDER)[number])) {
      continue
    }
    lines.push(`### ${cat}`, '')
    for (const row of catRows) {
      lines.push(placeMarkdownLine(row, true))
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}
