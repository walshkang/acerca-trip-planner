import type { CategoryEnum } from '@/lib/types/enums'

export type PlannerSlot = 'morning' | 'afternoon' | 'evening'

export const PLANNER_SLOT_ORDER: readonly PlannerSlot[] = [
  'morning',
  'afternoon',
  'evening',
]

export const PLANNER_SLOT_LABEL: Record<PlannerSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

export const PLANNER_SLOT_SENTINEL_TIME: Record<PlannerSlot, string> = {
  morning: '09:00:00',
  afternoon: '14:00:00',
  evening: '19:00:00',
}

export function scheduledStartTimeFromSlot(slot: PlannerSlot): string {
  return PLANNER_SLOT_SENTINEL_TIME[slot]
}

export function slotFromScheduledStartTime(
  time: string | null | undefined
): PlannerSlot | null {
  if (!time) return null
  const hhmm = time.slice(0, 5)
  if (hhmm === '09:00') return 'morning'
  if (hhmm === '14:00') return 'afternoon'
  if (hhmm === '19:00') return 'evening'
  return null
}

export const PLANNER_CATEGORY_ORDER: readonly CategoryEnum[] = [
  'Food',
  'Coffee',
  'Sights',
  'Activity',
  'Shop',
  'Drinks',
]

const PLANNER_CATEGORY_RANK = new Map<CategoryEnum, number>(
  PLANNER_CATEGORY_ORDER.map((value, index) => [value, index])
)

export function comparePlannerCategories(a: CategoryEnum, b: CategoryEnum): number {
  const aRank = PLANNER_CATEGORY_RANK.get(a)
  const bRank = PLANNER_CATEGORY_RANK.get(b)
  if (aRank == null && bRank == null) return a.localeCompare(b)
  if (aRank == null) return 1
  if (bRank == null) return -1
  return aRank - bRank
}

export function parseIsoDateOnly(input: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null
  const date = new Date(`${input}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  const roundTrip = date.toISOString().slice(0, 10)
  return roundTrip === input ? input : null
}

export function countIsoDatesInclusive(start: string, end: string): number | null {
  const parsedStart = parseIsoDateOnly(start)
  const parsedEnd = parseIsoDateOnly(end)
  if (!parsedStart || !parsedEnd) return null
  if (parsedStart > parsedEnd) return null

  const startDate = new Date(`${parsedStart}T00:00:00Z`)
  const endDate = new Date(`${parsedEnd}T00:00:00Z`)
  const ms = endDate.getTime() - startDate.getTime()
  if (ms < 0) return null
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
  return days >= 1 ? days : null
}

export function enumerateIsoDatesInclusive(
  start: string,
  end: string
): string[] | null {
  const parsedStart = parseIsoDateOnly(start)
  const parsedEnd = parseIsoDateOnly(end)
  if (!parsedStart || !parsedEnd) return null
  if (parsedStart > parsedEnd) return null

  const out: string[] = []
  let cursor = new Date(`${parsedStart}T00:00:00Z`)
  const endDate = new Date(`${parsedEnd}T00:00:00Z`)
  while (cursor.getTime() <= endDate.getTime()) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return out
}
