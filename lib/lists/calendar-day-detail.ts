import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import type { CategoryEnum } from '@/lib/types/enums'
import {
  type PlannerSlot,
  PLANNER_SLOT_ORDER,
  comparePlannerCategories,
  fractionalOrderBetween,
  slotFromScheduledStartTime,
} from '@/lib/lists/planner'

function orderValue(row: ListItemRow) {
  return typeof row.scheduled_order === 'number' ? row.scheduled_order : 0
}

export function sortByScheduledOrder(a: ListItemRow, b: ListItemRow) {
  const ao = typeof a.scheduled_order === 'number' ? a.scheduled_order : 0
  const bo = typeof b.scheduled_order === 'number' ? b.scheduled_order : 0
  if (ao !== bo) return ao - bo
  return a.created_at.localeCompare(b.created_at)
}

export function sortPlannerDetailItems(a: ListItemRow, b: ListItemRow) {
  const pa = a.place?.category as CategoryEnum
  const pb = b.place?.category as CategoryEnum
  const c = comparePlannerCategories(pa, pb)
  if (c !== 0) return c
  return sortByScheduledOrder(a, b)
}

/** Groups scheduled-day items by planner slot; unscheduled = no recognized sentinel time. */
export function groupItemsByPlannerSlot(items: ListItemRow[]): {
  bySlot: Record<PlannerSlot, ListItemRow[]>
  unscheduled: ListItemRow[]
} {
  const bySlot: Record<PlannerSlot, ListItemRow[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  }
  const unscheduled: ListItemRow[] = []
  for (const item of items) {
    const slot = slotFromScheduledStartTime(item.scheduled_start_time)
    if (slot) {
      bySlot[slot].push(item)
    } else {
      unscheduled.push(item)
    }
  }
  for (const slot of PLANNER_SLOT_ORDER) {
    bySlot[slot].sort(sortPlannerDetailItems)
  }
  unscheduled.sort(sortPlannerDetailItems)
  return { bySlot, unscheduled }
}

/** Slot order (morning → afternoon → evening), then same ordering as the day-detail panel within each slot. */
export function sortItemsForDayCellDisplay(items: ListItemRow[]): ListItemRow[] {
  return items.slice().sort((a, b) => {
    const sa = slotFromScheduledStartTime(a.scheduled_start_time)
    const sb = slotFromScheduledStartTime(b.scheduled_start_time)
    const ia = sa != null ? PLANNER_SLOT_ORDER.indexOf(sa) : 999
    const ib = sb != null ? PLANNER_SLOT_ORDER.indexOf(sb) : 999
    if (ia !== ib) return ia - ib
    return sortPlannerDetailItems(a, b)
  })
}

/**
 * Computes scheduled_order when moving into targetDate/targetSlot so numeric order respects
 * morning &lt; afternoon &lt; evening bands (cross-day and day-cell drops stay slot-ordered in the grid).
 */
export function nextScheduledOrderForSlot(
  dayItemsExcludingMoving: ListItemRow[],
  targetSlot: PlannerSlot,
  beforeItemId?: string | null
): number {
  const ti = PLANNER_SLOT_ORDER.indexOf(targetSlot)

  if (beforeItemId) {
    const sameSlot = dayItemsExcludingMoving
      .filter((row) => slotFromScheduledStartTime(row.scheduled_start_time) === targetSlot)
      .slice()
      .sort(sortByScheduledOrder)
    const idx = sameSlot.findIndex((row) => row.id === beforeItemId)
    if (idx >= 0) {
      const prev = idx > 0 ? orderValue(sameSlot[idx - 1]!) : null
      const next = orderValue(sameSlot[idx]!)
      return fractionalOrderBetween(prev, next)
    }
  }

  let maxBefore = null as number | null
  let minAfter = null as number | null
  let maxInTarget = null as number | null

  for (const row of dayItemsExcludingMoving) {
    const s = slotFromScheduledStartTime(row.scheduled_start_time)
    if (s == null) continue
    const si = PLANNER_SLOT_ORDER.indexOf(s)
    const o = orderValue(row)
    if (si < ti) maxBefore = maxBefore == null ? o : Math.max(maxBefore, o)
    else if (si > ti) minAfter = minAfter == null ? o : Math.min(minAfter, o)
    else maxInTarget = maxInTarget == null ? o : Math.max(maxInTarget, o)
  }

  const low = maxInTarget ?? maxBefore
  return fractionalOrderBetween(low, minAfter)
}
